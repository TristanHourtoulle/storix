import { and, asc, eq, exists, isNull, ne, or, sql } from 'drizzle-orm'
import {
  cardCopies,
  cardRarityHistory,
  cards,
  leagues,
  media,
  reactions,
  type DbExecutor,
} from '@storix/db'
import type { CardTier, ComputedTier, RarityCardInput, TierSource } from '@storix/shared/domain'

export type RarityInputRow = RarityCardInput & { tier: CardTier }

export interface RarityUpdateRow {
  cardId: string
  score: number
  percentile: number
  computedTier: ComputedTier
  tier: CardTier
  tierSource: TierSource
}

export interface RarityHistoryRow {
  leagueId: string
  cardId: string
  fromTier: CardTier | null
  toTier: CardTier
  source: TierSource
  score: number
  percentile: number
  computedAt: Date
}

/** Serializes rarity recomputes of one league for the rest of the transaction. */
export async function lockLeagueRarity(db: DbExecutor, leagueId: string): Promise<void> {
  await db.execute(sql`select pg_advisory_xact_lock(hashtext(${'rarity:' + leagueId}))`)
}

/** Reads the raw settings column of a league. */
export async function findLeagueSettings(db: DbExecutor, leagueId: string): Promise<unknown> {
  const [row] = await db
    .select({ settings: leagues.settings })
    .from(leagues)
    .where(eq(leagues.id, leagueId))
  return row?.settings ?? null
}

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

/** Writes computed rarity onto cards and marks them as no longer provisional. */
export async function applyRarityResults(
  db: DbExecutor,
  rows: readonly RarityUpdateRow[],
  now: Date,
): Promise<void> {
  for (const row of rows) {
    await db
      .update(cards)
      .set({
        score: row.score,
        percentile: row.percentile,
        computedTier: row.computedTier,
        tier: row.tier,
        tierSource: row.tierSource,
        isProvisional: false,
        rarityComputedAt: now,
      })
      .where(eq(cards.id, row.cardId))
  }
}

/** Appends tier change rows to the rarity history. */
export async function insertRarityHistory(
  db: DbExecutor,
  rows: readonly RarityHistoryRow[],
): Promise<void> {
  if (rows.length === 0) return
  await db.insert(cardRarityHistory).values([...rows])
}

/** Lists every league id. */
export async function listLeagueIds(db: DbExecutor): Promise<string[]> {
  const rows = await db.select({ id: leagues.id }).from(leagues)
  return rows.map((row) => row.id)
}
