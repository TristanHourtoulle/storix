import { cardCopies, cardRarityHistory, type DbExecutor } from '@storix/db'
import type { CardTier, RarityHistoryRow } from '@storix/shared'
import { and, desc, eq, isNotNull } from 'drizzle-orm'

export const RARITY_HISTORY_LIMIT = 50

/** Lists a card's rarity history rows, newest first. */
export async function listRarityHistory(
  db: DbExecutor,
  input: { cardId: string; limit: number },
): Promise<RarityHistoryRow[]> {
  return db
    .select({
      fromTier: cardRarityHistory.fromTier,
      toTier: cardRarityHistory.toTier,
      source: cardRarityHistory.source,
      computedAt: cardRarityHistory.computedAt,
    })
    .from(cardRarityHistory)
    .where(eq(cardRarityHistory.cardId, input.cardId))
    .orderBy(desc(cardRarityHistory.computedAt))
    .limit(input.limit)
}

/** Returns the viewer's highest promoted copy of a card with its promotion date, or null. */
export async function findViewerPromotion(
  db: DbExecutor,
  input: { leagueId: string; cardId: string; ownerId: string },
): Promise<{ tier: CardTier; at: Date } | null> {
  const rows = await db
    .select({ tier: cardCopies.promotedTier, at: cardCopies.promotedAt })
    .from(cardCopies)
    .where(
      and(
        eq(cardCopies.leagueId, input.leagueId),
        eq(cardCopies.cardId, input.cardId),
        eq(cardCopies.ownerId, input.ownerId),
        isNotNull(cardCopies.promotedTier),
        isNotNull(cardCopies.promotedAt),
      ),
    )
    .orderBy(desc(cardCopies.promotedTier))
    .limit(1)
  const row = rows[0]
  return row?.tier != null && row.at != null ? { tier: row.tier, at: row.at } : null
}
