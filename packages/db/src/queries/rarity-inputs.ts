import { and, asc, eq, exists, isNull, ne, or, sql } from 'drizzle-orm'
import type { CardTier, ComputedTier, RarityCardInput } from '@storix/shared/domain'
import type { DbExecutor } from '../client'
import { cardCopies, cards, media, reactions } from '../schema/index'

export type RarityInputRow = RarityCardInput & { tier: CardTier }

/** Lists the active cards of a league with the signals the rarity engine needs. */
export async function listRarityInputs(
  db: DbExecutor,
  leagueId: string,
): Promise<RarityInputRow[]> {
  const totals = db
    .select({
      cardId: reactions.cardId,
      reactors: sql<number>`count(distinct ${reactions.userId})`.mapWith(Number).as('reactors'),
      reactionSum: sql<number>`count(*)`.mapWith(Number).as('reaction_sum'),
    })
    .from(reactions)
    .innerJoin(cards, eq(cards.id, reactions.cardId))
    .where(
      and(
        eq(cards.leagueId, leagueId),
        or(isNull(cards.authorId), ne(cards.authorId, reactions.userId)),
        exists(
          db
            .select({ one: sql`1` })
            .from(cardCopies)
            .where(
              and(
                eq(cardCopies.cardId, reactions.cardId),
                eq(cardCopies.ownerId, reactions.userId),
              ),
            ),
        ),
      ),
    )
    .groupBy(reactions.cardId)
    .as('reaction_totals')

  const rows = await db
    .select({
      cardId: cards.id,
      authorId: cards.authorId,
      capturedAt: media.capturedAt,
      isCaptureDateValidated: media.isCaptureDateValidated,
      reactors: sql<number>`coalesce(${totals.reactors}, 0)`.mapWith(Number),
      reactionSum: sql<number>`coalesce(${totals.reactionSum}, 0)`.mapWith(Number),
      isProvisional: cards.isProvisional,
      computedTier: cards.computedTier,
      pinnedTier: cards.pinnedTier,
      minTier: cards.minTier,
      maxTier: cards.maxTier,
      tier: cards.tier,
    })
    .from(cards)
    .innerJoin(media, eq(media.id, cards.mediaId))
    .leftJoin(totals, eq(totals.cardId, cards.id))
    .where(and(eq(cards.leagueId, leagueId), eq(cards.status, 'active')))
    .orderBy(asc(cards.number))

  return rows.map(({ isProvisional, computedTier, minTier, maxTier, ...row }) => ({
    ...row,
    previousComputedTier: isProvisional ? null : (computedTier as ComputedTier | null),
    minTier: minTier as ComputedTier | null,
    maxTier: maxTier as ComputedTier | null,
  }))
}
