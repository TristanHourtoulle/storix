import { eq, sql } from 'drizzle-orm'
import { cardRarityHistory, cards, leagues, type DbExecutor } from '@storix/db'
import type { CardTier, ComputedTier, TierSource } from '@storix/shared/domain'

export { listRarityInputs, type RarityInputRow } from '@storix/db'

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

/**
 * Writes computed rarity onto cards and marks them as no longer provisional.
 * Rows are written in card-id order, the order booster discovery locks cards in, so the two never deadlock.
 */
export async function applyRarityResults(
  db: DbExecutor,
  rows: readonly RarityUpdateRow[],
  now: Date,
): Promise<void> {
  const byCardId = rows.toSorted((x, y) => (x.cardId < y.cardId ? -1 : x.cardId > y.cardId ? 1 : 0))
  for (const row of byCardId) {
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
