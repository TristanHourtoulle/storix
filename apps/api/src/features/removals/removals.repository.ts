import { cardCompensations, cardRemovals, type DbExecutor } from '@storix/db'
import { and, asc, eq, gte, sql } from 'drizzle-orm'

export interface RemovedCardRow {
  cardId: string
  number: number
  mediaPrefix: string
  removedAt: Date
  compensation: number
}

/** Lists the league tombstones since a date with the dust the viewer received for each. */
export async function listRemovedSince(
  db: DbExecutor,
  input: { leagueId: string; viewerId: string; since: Date; limit: number },
): Promise<RemovedCardRow[]> {
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
    .where(and(eq(cardRemovals.leagueId, input.leagueId), gte(cardRemovals.removedAt, input.since)))
    .orderBy(asc(cardRemovals.removedAt), asc(cardRemovals.cardId))
    .limit(input.limit)
}
