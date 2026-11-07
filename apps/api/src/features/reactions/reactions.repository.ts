import { reactions, type DbExecutor } from '@storix/db'
import type { ReactionCounts, ReactionType } from '@storix/shared'
import { eq, sql } from 'drizzle-orm'

/** Counts each reaction type on a card and whether the viewer gave it. */
export async function countReactions(
  db: DbExecutor,
  input: { cardId: string; viewerId: string },
): Promise<ReactionCounts> {
  const rows = await db
    .select({
      type: reactions.type,
      count: sql<number>`count(*)::int`,
      isMine: sql<boolean>`bool_or(${reactions.userId} = ${input.viewerId})`,
    })
    .from(reactions)
    .where(eq(reactions.cardId, input.cardId))
    .groupBy(reactions.type)
  const byType = new Map(rows.map((row) => [row.type, row]))
  const countOf = (type: ReactionType) => {
    const row = byType.get(type)
    return { count: row?.count ?? 0, isMine: row?.isMine ?? false }
  }
  return { fire: countOf('fire'), heart: countOf('heart'), star: countOf('star') }
}
