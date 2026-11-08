import type { Database } from '@storix/db'
import {
  computeBoosterFullAt,
  isBoosterFullNotificationDue,
  PUSH_SUBSCRIPTIONS_PER_USER_MAX,
  resolveLeagueSettings,
  type PushConfig,
  type PushSubscriptionBody,
} from '@storix/shared'
import type { AuthSession } from '../../auth/auth.gateway'
import { runInTransaction } from '../../lib/transaction'
import {
  countUserSubscriptions,
  deleteUserSubscription,
  lockArmedWallets,
  markWalletsNotified,
  pruneUserSubscriptions,
  upsertSubscription,
  type ArmedWallet,
} from './push.repository'

export interface PushService {
  getConfig(): PushConfig
  subscribe(session: AuthSession, body: PushSubscriptionBody): Promise<void>
  unsubscribe(session: AuthSession, endpoint: string): Promise<void>
}

export interface PushServiceDeps {
  db: Database
  clock: () => Date
  publicKey: string | null
}

function isDue(wallet: ArmedWallet, now: Date): boolean {
  const { booster } = resolveLeagueSettings(wallet.settings)
  const fullAt = computeBoosterFullAt(
    { stock: wallet.boosterStock, anchor: wallet.boosterStockAt },
    booster,
  )
  return isBoosterFullNotificationDue({ fullAt, now, notifiedAt: null })
}

/** Builds the service exposing the VAPID public key and storing per-device push subscriptions. */
export function createPushService({ db, clock, publicKey }: PushServiceDeps): PushService {
  return {
    getConfig: () => ({ publicKey }),

    subscribe: (session, body) =>
      runInTransaction(db, async (tx) => {
        const now = clock()
        const { userId } = session
        if ((await countUserSubscriptions(tx, userId)) === 0) {
          const armed = await lockArmedWallets(tx, userId)
          const due = armed.filter((wallet) => isDue(wallet, now)).map((wallet) => wallet.leagueId)
          await markWalletsNotified(tx, userId, due, now)
        }
        await upsertSubscription(tx, {
          userId,
          endpoint: body.endpoint,
          p256dh: body.keys.p256dh,
          auth: body.keys.auth,
          now,
        })
        await pruneUserSubscriptions(tx, userId, PUSH_SUBSCRIPTIONS_PER_USER_MAX)
      }),

    async unsubscribe(session, endpoint) {
      await deleteUserSubscription(db, session.userId, endpoint)
    },
  }
}
