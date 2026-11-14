import { and, asc, eq, gt, inArray, isNull, lte, sql } from 'drizzle-orm'
import { acceptsPhoto, type PhotoTiming } from '@storix/shared/domain'
import type { DbExecutor } from '../client'
import { cardSeries } from '../schema/index'
import type { SeriesRecord } from './series'

export interface NewEvent {
  leagueId: string
  title: string
  icon: string
  color: string
  startsAt: Date
  endsAt: Date
  graceEndsAt: Date
  createdById: string
}

export interface EventEdit {
  title?: string
  icon?: string
  color?: string
  startsAt?: Date
  endsAt?: Date
  graceEndsAt?: Date
}

const isEvent = eq(cardSeries.kind, 'event')

/** Counts the league's events that have not ended yet: upcoming and live ones. */
export async function countActiveEvents(
  db: DbExecutor,
  input: { leagueId: string; now: Date },
): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(cardSeries)
    .where(
      and(
        eq(cardSeries.leagueId, input.leagueId),
        isEvent,
        isNull(cardSeries.closedAt),
        gt(cardSeries.endsAt, input.now),
      ),
    )
  return row?.n ?? 0
}

/** Inserts a scheduled event of a league. */
export async function insertEvent(db: DbExecutor, input: NewEvent): Promise<SeriesRecord> {
  const [row] = await db
    .insert(cardSeries)
    .values({ ...input, kind: 'event' })
    .returning()
  if (row === undefined) throw new Error('Event insert returned no row')
  return row
}

/** Loads one event of a league, or null. */
export async function findEvent(
  db: DbExecutor,
  input: { leagueId: string; seriesId: string },
): Promise<SeriesRecord | null> {
  const [row] = await db
    .select()
    .from(cardSeries)
    .where(and(eq(cardSeries.leagueId, input.leagueId), eq(cardSeries.id, input.seriesId), isEvent))
    .limit(1)
  return row ?? null
}

/** Edits an event that has not started yet; null when it started meanwhile. */
export async function updateUpcomingEvent(
  db: DbExecutor,
  input: { seriesId: string; edit: EventEdit; now: Date },
): Promise<SeriesRecord | null> {
  const [row] = await db
    .update(cardSeries)
    .set(input.edit)
    .where(and(eq(cardSeries.id, input.seriesId), isEvent, gt(cardSeries.startsAt, input.now)))
    .returning()
  return row ?? null
}

/** Deletes an event that has not started yet; false when it started meanwhile. */
export async function deleteUpcomingEvent(
  db: DbExecutor,
  input: { seriesId: string; now: Date },
): Promise<boolean> {
  const rows = await db
    .delete(cardSeries)
    .where(and(eq(cardSeries.id, input.seriesId), isEvent, gt(cardSeries.startsAt, input.now)))
    .returning({ id: cardSeries.id })
  return rows.length > 0
}

/** Ends a live event now and opens its grace window; null when it is not live anymore. */
export async function endEventNow(
  db: DbExecutor,
  input: { seriesId: string; now: Date; graceEndsAt: Date },
): Promise<SeriesRecord | null> {
  const [row] = await db
    .update(cardSeries)
    .set({ endsAt: input.now, graceEndsAt: input.graceEndsAt })
    .where(
      and(
        eq(cardSeries.id, input.seriesId),
        isEvent,
        isNull(cardSeries.closedAt),
        lte(cardSeries.startsAt, input.now),
        gt(cardSeries.endsAt, input.now),
      ),
    )
    .returning()
  return row ?? null
}

/** Lists the events of a league that are not closed, soonest first. */
export async function listOpenEvents(
  db: DbExecutor,
  input: { leagueId: string },
): Promise<SeriesRecord[]> {
  return db
    .select()
    .from(cardSeries)
    .where(and(eq(cardSeries.leagueId, input.leagueId), isEvent, isNull(cardSeries.closedAt)))
    .orderBy(asc(cardSeries.startsAt))
}

/** Marks every started event whose start was not announced yet, and returns them; each one exactly once. */
export async function claimEventStarts(db: DbExecutor, now: Date): Promise<SeriesRecord[]> {
  return db
    .update(cardSeries)
    .set({ startNotifiedAt: now })
    .where(and(isEvent, isNull(cardSeries.startNotifiedAt), lte(cardSeries.startsAt, now)))
    .returning()
}

/** Marks the end of an event as announced; false when another run already did it. */
export async function claimEventEnd(
  db: DbExecutor,
  input: { seriesId: string; now: Date },
): Promise<boolean> {
  const rows = await db
    .update(cardSeries)
    .set({ endNotifiedAt: input.now })
    .where(and(eq(cardSeries.id, input.seriesId), isEvent, isNull(cardSeries.endNotifiedAt)))
    .returning({ id: cardSeries.id })
  return rows.length > 0
}

/** Lists the members who added at least one active card to a series. */
export async function listSeriesContributorIds(
  db: DbExecutor,
  seriesId: string,
): Promise<string[]> {
  const result = await db.execute<{ author_id: string }>(sql`
    SELECT DISTINCT c.author_id
    FROM card_series_cards sc JOIN cards c ON c.id = sc.card_id AND c.status = 'active'
    WHERE sc.series_id = ${seriesId} AND c.author_id IS NOT NULL`)
  return result.rows.map((row) => row.author_id)
}

/** Keeps the ids of the league's series that take a photo with this timing, in the given order. */
export async function filterSeriesForPhoto(
  db: DbExecutor,
  input: { leagueId: string; seriesIds: readonly string[]; photo: PhotoTiming },
): Promise<string[]> {
  if (input.seriesIds.length === 0) return []
  const rows = await db
    .select()
    .from(cardSeries)
    .where(
      and(eq(cardSeries.leagueId, input.leagueId), inArray(cardSeries.id, [...input.seriesIds])),
    )
  const open = new Set(rows.filter((row) => acceptsPhoto(row, input.photo)).map((row) => row.id))
  return input.seriesIds.filter((id) => open.has(id))
}
