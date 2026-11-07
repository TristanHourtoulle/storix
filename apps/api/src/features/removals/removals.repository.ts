import { cardCompensations, cardRemovals, type DbExecutor } from '@storix/db'
import { and, asc, eq, sql } from 'drizzle-orm'

export interface RemovedCardRow {
  cardId: string
  number: number
  mediaPrefix: string
  removedAt: Date
  compensation: number
}

const removedAtMs = sql<Date>`date_trunc('milliseconds', ${cardRemovals.removedAt})`

/** Lists the league tombstones after a (removedAt, cardId) key, or since a date, with the dust the viewer received for each. */
export async function listRemovedSince(
  db: DbExecutor,
  input: { leagueId: string; viewerId: string; since: Date; after?: string; limit: number },
): Promise<RemovedCardRow[]> {
  const window =
    input.after === undefined
      ? sql`${removedAtMs} >= ${input.since}::timestamptz`
      : sql`(${removedAtMs}, ${cardRemovals.cardId}) > (${input.since}::timestamptz, ${input.after}::uuid)`
  return db
    .select({
      cardId: cardRemovals.cardId,
      number: cardRemovals.number,
      mediaPrefix: cardRemovals.mediaPrefix,
      removedAt: cardRemovals.removedAt,
      compensation: sql<number>`coalesce(${cardCompensations.dust}, 0)`.mapWith(Number),
    })
    .from(cardRemovals)
    .leftJoin(
      cardCompensations,
      and(
        eq(cardCompensations.cardId, cardRemovals.cardId),
        eq(cardCompensations.userId, input.viewerId),
      ),
    )
    .where(and(eq(cardRemovals.leagueId, input.leagueId), window))
    .orderBy(asc(removedAtMs), asc(cardRemovals.cardId))
    .limit(input.limit)
}
