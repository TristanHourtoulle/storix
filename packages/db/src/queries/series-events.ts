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

/** Lists the started events whose start was not announced yet, oldest first. */
export async function listUnannouncedStarts(db: DbExecutor, now: Date): Promise<SeriesRecord[]> {
  return db
    .select()
    .from(cardSeries)
    .where(and(isEvent, isNull(cardSeries.startNotifiedAt), lte(cardSeries.startsAt, now)))
    .orderBy(asc(cardSeries.startsAt))
}

/** Marks the start of an event as announced; false when another run already did it. */
export async function claimEventStart(
  db: DbExecutor,
  input: { seriesId: string; now: Date },
): Promise<boolean> {
  const rows = await db
    .update(cardSeries)
    .set({ startNotifiedAt: input.now })
    .where(and(eq(cardSeries.id, input.seriesId), isEvent, isNull(cardSeries.startNotifiedAt)))
    .returning({ id: cardSeries.id })
  return rows.length > 0
}

/** Counts the events a member scheduled since `since`, cancelled ones excluded. */
export async function countEventsCreatedSince(
  db: DbExecutor,
  input: { leagueId: string; userId: string; since: Date },
): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(cardSeries)
    .where(
      and(
        eq(cardSeries.leagueId, input.leagueId),
        isEvent,
        eq(cardSeries.createdById, input.userId),
        gt(cardSeries.createdAt, input.since),
      ),
    )
  return row?.n ?? 0
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

/** Lists the members who added active cards to a series, with how many each. */
export async function listSeriesContributors(
  db: DbExecutor,
  seriesId: string,
): Promise<{ userId: string; cards: number }[]> {
  const result = await db.execute<{ author_id: string; n: unknown }>(sql`
    SELECT c.author_id, count(*) AS n
    FROM card_series_cards sc JOIN cards c ON c.id = sc.card_id AND c.status = 'active'
    WHERE sc.series_id = ${seriesId} AND c.author_id IS NOT NULL
    GROUP BY c.author_id`)
  return result.rows.map((row) => ({ userId: row.author_id, cards: Number(row.n) }))
}

/**
 * Keeps the ids of the league's series that take a photo with this timing, in the given order. The rows are
 * share-locked, so inside a transaction a series cannot close between this check and the card being attached.
 */
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
    .for('share')
  const open = new Set(rows.filter((row) => acceptsPhoto(row, input.photo)).map((row) => row.id))
  return input.seriesIds.filter((id) => open.has(id))
}
