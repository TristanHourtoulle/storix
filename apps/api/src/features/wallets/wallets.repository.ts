import { lockLeagueEconomyShared, memberWallets, type DbExecutor } from '@storix/db'
import { computeBoosterFullAt, type BoosterCadence } from '@storix/shared'
import { and, eq } from 'drizzle-orm'

export { lockLeagueEconomyExclusive, lockLeagueEconomyShared } from '@storix/db'

export interface WalletRow {
  leagueId: string
  userId: string
  dust: number
  boosterStock: number
  boosterStockAt: Date
  pitySinceEpic: number
  pitySinceLegendary: number
  boostersOpened: number
  bonusBoosters: number
  premiumGifts: number
}

export interface WalletKey {
  leagueId: string
  userId: string
}

export type EnsureWalletInput = WalletKey & { cadence: BoosterCadence; now: Date }

export type WalletPatch = Partial<
  Omit<WalletRow, 'leagueId' | 'userId'> & { boosterFullNotifiedAt: Date | null }
>

const walletColumns = {
  leagueId: memberWallets.leagueId,
  userId: memberWallets.userId,
  dust: memberWallets.dust,
  boosterStock: memberWallets.boosterStock,
  boosterStockAt: memberWallets.boosterStockAt,
  pitySinceEpic: memberWallets.pitySinceEpic,
  pitySinceLegendary: memberWallets.pitySinceLegendary,
  boostersOpened: memberWallets.boostersOpened,
  bonusBoosters: memberWallets.bonusBoosters,
  premiumGifts: memberWallets.premiumGifts,
}

function keyCondition(leagueId: string, userId: string) {
  return and(eq(memberWallets.leagueId, leagueId), eq(memberWallets.userId, userId))
}

/** Creates the wallet with the joining gift unless it already exists, already marked as notified when the gift fills the stock. */
export async function ensureWallet(db: DbExecutor, input: EnsureWalletInput): Promise<void> {
  const { cadence, now } = input
  const fullAt = computeBoosterFullAt({ stock: cadence.joinGift, anchor: now }, cadence)
  await db
    .insert(memberWallets)
    .values({
      leagueId: input.leagueId,
      userId: input.userId,
      boosterStock: cadence.joinGift,
      boosterStockAt: now,
      boosterFullNotifiedAt: fullAt.getTime() <= now.getTime() ? now : null,
    })
    .onConflictDoNothing()
}

/** Finds a member wallet. */
export async function findWallet(
  db: DbExecutor,
  leagueId: string,
  userId: string,
): Promise<WalletRow | null> {
  const rows = await db
    .select(walletColumns)
    .from(memberWallets)
    .where(keyCondition(leagueId, userId))
    .limit(1)
  return rows[0] ?? null
}

/** Reads a member wallet under the shared league economy lock and a row lock, failing when it does not exist. */
export async function lockWallet(
  db: DbExecutor,
  leagueId: string,
  userId: string,
): Promise<WalletRow> {
  await lockLeagueEconomyShared(db, leagueId)
  const rows = await db
    .select(walletColumns)
    .from(memberWallets)
    .where(keyCondition(leagueId, userId))
    .limit(1)
    .for('update')
  const row = rows[0]
  if (row === undefined) throw new Error('Member wallet not found')
  return row
}

/** Applies a partial update to a member wallet. */
export async function updateWallet(
  db: DbExecutor,
  key: WalletKey,
  patch: WalletPatch,
): Promise<void> {
  await db
    .update(memberWallets)
    .set({ ...patch, updatedAt: new Date() })
    .where(keyCondition(key.leagueId, key.userId))
}
