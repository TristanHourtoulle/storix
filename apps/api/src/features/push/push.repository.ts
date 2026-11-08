import { leagues, memberWallets, pushSubscriptions, type DbExecutor } from '@storix/db'
import { and, asc, count, desc, eq, inArray, isNull, notInArray } from 'drizzle-orm'

export interface UpsertSubscriptionInput {
  userId: string
  endpoint: string
  p256dh: string
  auth: string
  now: Date
}

export interface ArmedWallet {
  leagueId: string
  settings: unknown
  boosterStock: number
  boosterStockAt: Date
}

/** Counts the push subscriptions of a user. */
export async function countUserSubscriptions(db: DbExecutor, userId: string): Promise<number> {
  const rows = await db
    .select({ value: count() })
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId))
  return rows[0]?.value ?? 0
}

/** Inserts a subscription, or moves an existing endpoint to this user with fresh keys. */
export async function upsertSubscription(
  db: DbExecutor,
  input: UpsertSubscriptionInput,
): Promise<void> {
  await db
    .insert(pushSubscriptions)
    .values({
      userId: input.userId,
      endpoint: input.endpoint,
      p256dh: input.p256dh,
      auth: input.auth,
      createdAt: input.now,
      updatedAt: input.now,
    })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: {
        userId: input.userId,
        p256dh: input.p256dh,
        auth: input.auth,
        updatedAt: input.now,
      },
    })
}

/** Deletes every subscription of a user beyond the newest `keep` by update time. */
export async function pruneUserSubscriptions(
  db: DbExecutor,
  userId: string,
  keep: number,
): Promise<void> {
  const newest = db
    .select({ id: pushSubscriptions.id })
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId))
    .orderBy(desc(pushSubscriptions.updatedAt), desc(pushSubscriptions.id))
    .limit(keep)
  await db
    .delete(pushSubscriptions)
    .where(and(eq(pushSubscriptions.userId, userId), notInArray(pushSubscriptions.id, newest)))
}

/** Deletes one subscription of a user; an unknown endpoint is a no-op. */
export async function deleteUserSubscription(
  db: DbExecutor,
  userId: string,
  endpoint: string,
): Promise<void> {
  await db
    .delete(pushSubscriptions)
    .where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.endpoint, endpoint)))
}

/** Locks, in league id order, the wallets of a user whose booster-full marker is armed, with their league settings. */
export async function lockArmedWallets(db: DbExecutor, userId: string): Promise<ArmedWallet[]> {
  return db
    .select({
      leagueId: memberWallets.leagueId,
      settings: leagues.settings,
      boosterStock: memberWallets.boosterStock,
      boosterStockAt: memberWallets.boosterStockAt,
    })
    .from(memberWallets)
    .innerJoin(leagues, eq(leagues.id, memberWallets.leagueId))
    .where(and(eq(memberWallets.userId, userId), isNull(memberWallets.boosterFullNotifiedAt)))
    .orderBy(asc(memberWallets.leagueId))
    .for('update', { of: memberWallets })
}

/** Sets the booster-full marker on the given armed wallets of a user. */
export async function markWalletsNotified(
  db: DbExecutor,
  userId: string,
  leagueIds: readonly string[],
  now: Date,
): Promise<void> {
  if (leagueIds.length === 0) return
  await db
    .update(memberWallets)
    .set({ boosterFullNotifiedAt: now })
    .where(
      and(
        eq(memberWallets.userId, userId),
        inArray(memberWallets.leagueId, [...leagueIds]),
        isNull(memberWallets.boosterFullNotifiedAt),
      ),
    )
}
