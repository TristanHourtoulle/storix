import { eq } from 'drizzle-orm'
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

/** Records a league's Moment once; true only for the call that inserted it. */
export async function claimMoment(
  db: DbExecutor,
  input: { leagueId: string; day: string; firesAt: Date; notifiedAt: Date | null },
): Promise<boolean> {
  const rows = await db
    .insert(moments)
    .values(input)
    .onConflictDoNothing()
    .returning({ leagueId: moments.leagueId })
  return rows.length > 0
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
