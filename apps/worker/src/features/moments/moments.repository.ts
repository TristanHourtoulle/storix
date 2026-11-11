import { and, eq, isNull } from 'drizzle-orm'
import { leagueMembers, leagues, moments, pushSubscriptions, type DbExecutor } from '@storix/db'
import type { PushTarget } from '../../lib/push-sender.types'

export { deletePushSubscription } from '../push/booster-full.repository'

export interface MomentLeague {
  id: string
  name: string
}

/** Lists every league with its name. */
export function listLeagues(db: DbExecutor): Promise<MomentLeague[]> {
  return db.select({ id: leagues.id, name: leagues.name }).from(leagues)
}

/** Records a league's Moment once; a no-op when it is already recorded. */
export async function claimMoment(
  db: DbExecutor,
  input: { leagueId: string; day: string; firesAt: Date },
): Promise<void> {
  await db.insert(moments).values(input).onConflictDoNothing()
}

/** Tells whether a recorded Moment still waits for its push. */
export async function isMomentUnnotified(
  db: DbExecutor,
  input: { leagueId: string; day: string },
): Promise<boolean> {
  const rows = await db
    .select({ leagueId: moments.leagueId })
    .from(moments)
    .where(
      and(
        eq(moments.leagueId, input.leagueId),
        eq(moments.day, input.day),
        isNull(moments.notifiedAt),
      ),
    )
    .limit(1)
  return rows.length > 0
}

/** Stamps a Moment as pushed, once every device was tried. */
export async function markMomentNotified(
  db: DbExecutor,
  input: { leagueId: string; day: string; now: Date },
): Promise<void> {
  await db
    .update(moments)
    .set({ notifiedAt: input.now })
    .where(and(eq(moments.leagueId, input.leagueId), eq(moments.day, input.day)))
}

/** Lists the push subscriptions of every member of a league. */
export function listLeaguePushTargets(db: DbExecutor, leagueId: string): Promise<PushTarget[]> {
  return db
    .select({
      endpoint: pushSubscriptions.endpoint,
      p256dh: pushSubscriptions.p256dh,
      auth: pushSubscriptions.auth,
    })
    .from(pushSubscriptions)
    .innerJoin(leagueMembers, eq(leagueMembers.userId, pushSubscriptions.userId))
    .where(eq(leagueMembers.leagueId, leagueId))
}
