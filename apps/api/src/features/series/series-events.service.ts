import type { Database } from '@storix/db'
import {
  EVENT_MAX_ACTIVE,
  eventGraceEndsAt,
  hasRoleAtLeast,
  seriesColorFor,
  seriesIconSchema,
  seriesPhase,
  validateEventWindow,
  type EventBody,
  type EventList,
  type EventPatch,
  type EventSummary,
} from '@storix/shared'
import { AppError, forbidden, notFound } from '../../lib/errors'
import { runInTransaction } from '../../lib/transaction'
import type { Membership } from '../leagues/leagues.service'
import { listGoalPeople } from '../league-goal/league-goal.repository'
import {
  countActiveEvents,
  deleteUpcomingEvent,
  endEventNow,
  findEvent,
  insertEvent,
  lockLeagueSeries,
  updateUpcomingEvent,
  type EventEdit,
  type SeriesRecord,
} from './series-events.repository'
import {
  listSeriesContributions,
  listSeriesWithCounts,
  type SeriesWithCounts,
} from './series.repository'

export interface SeriesEventsService {
  list(m: Membership): Promise<EventList>
  create(m: Membership, body: EventBody): Promise<EventSummary>
  update(m: Membership, seriesId: string, patch: EventPatch): Promise<EventSummary>
  cancel(m: Membership, seriesId: string): Promise<void>
  end(m: Membership, seriesId: string): Promise<EventSummary>
}

interface Deps {
  db: Database
  clock: () => Date
}

function canManage(m: Membership, createdById: string | null): boolean {
  return createdById === m.userId || hasRoleAtLeast(m.role, 'admin')
}

function assertWindow(startsAt: Date, endsAt: Date, now: Date): void {
  const check = validateEventWindow({ startsAt, endsAt, now })
  if (check !== 'ok')
    throw new AppError('EVENT_WINDOW_INVALID', 400, `Invalid event window: ${check}`)
}

/** Builds the scheduled events use cases: list, create, edit or cancel before the start, end early. */
export function createSeriesEventsService({ db, clock }: Deps): SeriesEventsService {
  async function summaries(
    m: Membership,
    rows: readonly SeriesWithCounts[],
  ): Promise<EventSummary[]> {
    const now = clock()
    const creatorIds = [
      ...new Set(rows.flatMap((row) => (row.createdById ? [row.createdById] : []))),
    ]
    const [people, members] = await Promise.all([
      listGoalPeople(db, m.leagueId, creatorIds),
      Promise.all(
        rows.map((row) => listSeriesContributions(db, { leagueId: m.leagueId, seriesId: row.id })),
      ),
    ])
    const names = new Map(people.map((person) => [person.userId, person.displayUsername]))
    return rows.map((row, index) => {
      const name = row.createdById === null ? undefined : names.get(row.createdById)
      return {
        id: row.id,
        kind: row.kind,
        title: row.title,
        icon: seriesIconSchema.parse(row.icon),
        color: row.color,
        phase: seriesPhase(row, now),
        startsAt: row.startsAt.toISOString(),
        endsAt: row.endsAt.toISOString(),
        graceEndsAt: row.graceEndsAt.toISOString(),
        cardCount: row.cardCount,
        ownedCount: row.ownedCount,
        createdBy:
          row.createdById === null || name === undefined
            ? null
            : { userId: row.createdById, displayUsername: name },
        canManage: canManage(m, row.createdById),
        memberCount: members[index]?.length ?? 0,
      }
    })
  }

  async function summaryOf(m: Membership, seriesId: string): Promise<EventSummary> {
    const rows = await listSeriesWithCounts(db, {
      leagueId: m.leagueId,
      viewerId: m.userId,
      seriesId,
    })
    const [summary] = await summaries(m, rows)
    if (summary === undefined) throw notFound('Event not found')
    return summary
  }

  async function managed(m: Membership, seriesId: string): Promise<SeriesRecord> {
    const event = await findEvent(db, { leagueId: m.leagueId, seriesId })
    if (event === null) throw notFound('Event not found')
    if (!canManage(m, event.createdById))
      throw forbidden('Only the creator or an admin can do this')
    return event
  }

  return {
    async list(m) {
      const rows = await listSeriesWithCounts(db, {
        leagueId: m.leagueId,
        viewerId: m.userId,
        openEventsOnly: true,
      })
      const all = await summaries(
        m,
        rows.toSorted((a, b) => a.startsAt.getTime() - b.startsAt.getTime()),
      )
      return {
        live: all
          .filter((event) => event.phase === 'live')
          .toSorted((a, b) => a.endsAt.localeCompare(b.endsAt)),
        grace: all.filter((event) => event.phase === 'grace'),
        upcoming: all.filter((event) => event.phase === 'upcoming'),
      }
    },

    async create(m, body) {
      const now = clock()
      const startsAt = new Date(body.startsAt)
      const endsAt = new Date(body.endsAt)
      assertWindow(startsAt, endsAt, now)
      const created = await runInTransaction(db, async (tx) => {
        await lockLeagueSeries(tx, m.leagueId)
        if ((await countActiveEvents(tx, { leagueId: m.leagueId, now })) >= EVENT_MAX_ACTIVE) {
          throw new AppError('EVENT_LIMIT_REACHED', 409, 'Too many events planned')
        }
        return insertEvent(tx, {
          leagueId: m.leagueId,
          title: body.title,
          icon: body.icon,
          color: seriesColorFor(body.title),
          startsAt,
          endsAt,
          graceEndsAt: eventGraceEndsAt(endsAt),
          createdById: m.userId,
        })
      })
      return summaryOf(m, created.id)
    },

    async update(m, seriesId, patch) {
      const now = clock()
      const event = await managed(m, seriesId)
      if (event.startsAt <= now) {
        throw new AppError('EVENT_ALREADY_STARTED', 409, 'The event already started')
      }
      const startsAt = patch.startsAt === undefined ? event.startsAt : new Date(patch.startsAt)
      const endsAt = patch.endsAt === undefined ? event.endsAt : new Date(patch.endsAt)
      assertWindow(startsAt, endsAt, now)
      const edit: EventEdit = {
        ...(patch.title === undefined
          ? {}
          : { title: patch.title, color: seriesColorFor(patch.title) }),
        ...(patch.icon === undefined ? {} : { icon: patch.icon }),
        startsAt,
        endsAt,
        graceEndsAt: eventGraceEndsAt(endsAt),
      }
      const updated = await updateUpcomingEvent(db, { seriesId, edit, now })
      if (updated === null) {
        throw new AppError('EVENT_ALREADY_STARTED', 409, 'The event already started')
      }
      return summaryOf(m, seriesId)
    },

    async cancel(m, seriesId) {
      await managed(m, seriesId)
      if (!(await deleteUpcomingEvent(db, { seriesId, now: clock() }))) {
        throw new AppError('EVENT_ALREADY_STARTED', 409, 'The event already started')
      }
    },

    async end(m, seriesId) {
      await managed(m, seriesId)
      const now = clock()
      const ended = await endEventNow(db, { seriesId, now, graceEndsAt: eventGraceEndsAt(now) })
      if (ended === null) throw new AppError('EVENT_NOT_LIVE', 409, 'The event is not live')
      return summaryOf(m, seriesId)
    },
  }
}
