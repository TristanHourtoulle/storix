import { memberWallets, type DbExecutor } from '@storix/db'
import { and, eq } from 'drizzle-orm'

export interface WalletRow {
  leagueId: string
  userId: string
  dust: number
  boosterStock: number
  boosterStockAt: Date
  pitySinceEpic: number
  pitySinceLegendary: number
}

export interface WalletKey {
  leagueId: string
  userId: string
}

export interface EnsureWalletInput extends WalletKey {
  joinGift: number
  now: Date
}

const walletColumns = {
  leagueId: memberWallets.leagueId,
  userId: memberWallets.userId,
  dust: memberWallets.dust,
  boosterStock: memberWallets.boosterStock,
  boosterStockAt: memberWallets.boosterStockAt,
  pitySinceEpic: memberWallets.pitySinceEpic,
  pitySinceLegendary: memberWallets.pitySinceLegendary,
}

function keyCondition(leagueId: string, userId: string) {
  return and(eq(memberWallets.leagueId, leagueId), eq(memberWallets.userId, userId))
}

/** Creates the wallet with the joining gift unless it already exists. */
export async function ensureWallet(db: DbExecutor, input: EnsureWalletInput): Promise<void> {
  await db
    .insert(memberWallets)
    .values({
      leagueId: input.leagueId,
      userId: input.userId,
      boosterStock: input.joinGift,
      boosterStockAt: input.now,
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

/** Reads a member wallet under a row lock, failing when it does not exist. */
export async function lockWallet(
  db: DbExecutor,
  leagueId: string,
  userId: string,
): Promise<WalletRow> {
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
  patch: Partial<Omit<WalletRow, 'leagueId' | 'userId'>>,
): Promise<void> {
  await db
    .update(memberWallets)
    .set({ ...patch, updatedAt: new Date() })
    .where(keyCondition(key.leagueId, key.userId))
}
