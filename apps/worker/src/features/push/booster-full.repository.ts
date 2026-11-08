import { and, asc, eq, exists, isNull, sql } from 'drizzle-orm'
import { leagues, memberWallets, pushSubscriptions, type DbExecutor } from '@storix/db'
import type { PushTarget } from '../../lib/push-sender.types'

export interface BoosterFullCandidate {
  leagueId: string
  leagueName: string
  settings: unknown
  userId: string
  boosterStock: number
  boosterStockAt: Date
}

export interface BoosterFullClaim {
  leagueId: string
  userId: string
  boosterStock: number
  boosterStockAt: Date
  now: Date
}

export interface CandidatePage {
  limit: number
  after: { leagueId: string; userId: string } | null
}

/**
 * Lists one page of armed wallets (no marker) of users with at least one push subscription, in wallet key order
 * after the given key, with their league name and settings.
 */
export async function listBoosterFullCandidates(
  db: DbExecutor,
  page: CandidatePage,
): Promise<BoosterFullCandidate[]> {
  const subscribed = db
    .select({ id: pushSubscriptions.id })
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, memberWallets.userId))
  const afterKey = page.after
    ? sql`(${memberWallets.leagueId}, ${memberWallets.userId}) > (${page.after.leagueId}::uuid, ${page.after.userId})`
    : undefined
  return db
    .select({
      leagueId: memberWallets.leagueId,
      leagueName: leagues.name,
      settings: leagues.settings,
      userId: memberWallets.userId,
      boosterStock: memberWallets.boosterStock,
      boosterStockAt: memberWallets.boosterStockAt,
    })
    .from(memberWallets)
    .innerJoin(leagues, eq(leagues.id, memberWallets.leagueId))
    .where(and(isNull(memberWallets.boosterFullNotifiedAt), exists(subscribed), afterKey))
    .orderBy(asc(memberWallets.leagueId), asc(memberWallets.userId))
    .limit(page.limit)
}

export interface ClaimLeague {
  name: string
  settings: unknown
}

/**
 * Reads the league's live name and settings and holds a share lock on its row until the transaction ends, so a
 * concurrent settings update either commits first (and is read here) or waits and then re-arms the claimed wallet.
 */
export async function lockLeagueForClaim(
  db: DbExecutor,
  leagueId: string,
): Promise<ClaimLeague | null> {
  const [row] = await db
    .select({ name: leagues.name, settings: leagues.settings })
    .from(leagues)
    .where(eq(leagues.id, leagueId))
    .for('share')
  return row ?? null
}

/**
 * Sets the marker only if the wallet is still armed and its stock and anchor are unchanged since the read.
 * The anchor is compared at millisecond precision because backfilled rows hold microseconds a JS Date cannot carry.
 */
export async function claimBoosterFull(db: DbExecutor, claim: BoosterFullClaim): Promise<boolean> {
  const rows = await db
    .update(memberWallets)
    .set({ boosterFullNotifiedAt: claim.now })
    .where(
      and(
        eq(memberWallets.leagueId, claim.leagueId),
        eq(memberWallets.userId, claim.userId),
        isNull(memberWallets.boosterFullNotifiedAt),
        eq(memberWallets.boosterStock, claim.boosterStock),
        sql`date_trunc('milliseconds', ${memberWallets.boosterStockAt}) = ${claim.boosterStockAt}`,
      ),
    )
    .returning({ leagueId: memberWallets.leagueId })
  return rows.length > 0
}

/** Lists every device subscription of a user. */
export async function listUserPushTargets(db: DbExecutor, userId: string): Promise<PushTarget[]> {
  return db
    .select({
      endpoint: pushSubscriptions.endpoint,
      p256dh: pushSubscriptions.p256dh,
      auth: pushSubscriptions.auth,
    })
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId))
}

/** Deletes the subscription with the given endpoint. */
export async function deletePushSubscription(db: DbExecutor, endpoint: string): Promise<void> {
  await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint))
}
