import { leagueMembers, pushSubscriptions, type DbExecutor } from '@storix/db'
import { and, eq, inArray } from 'drizzle-orm'
import type { PushTarget } from '../../lib/push-sender.types'

export {
  claimEventEnd,
  claimEventStart,
  listSeriesContributors,
  listUnannouncedStarts,
} from '@storix/db'
export { deletePushSubscription } from '../push/booster-full.repository'

/** Lists the push subscriptions of a league's members, or of some of them. */
export function listEventPushTargets(
  db: DbExecutor,
  input: { leagueId: string; userIds?: readonly string[] },
): Promise<PushTarget[]> {
  return db
    .select({
      endpoint: pushSubscriptions.endpoint,
      p256dh: pushSubscriptions.p256dh,
      auth: pushSubscriptions.auth,
    })
    .from(pushSubscriptions)
    .innerJoin(leagueMembers, eq(leagueMembers.userId, pushSubscriptions.userId))
    .where(
      and(
        eq(leagueMembers.leagueId, input.leagueId),
        input.userIds === undefined
          ? undefined
          : inArray(pushSubscriptions.userId, [...input.userIds]),
      ),
    )
}
