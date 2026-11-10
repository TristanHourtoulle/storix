import { leagueMembers, leagueReads, portraits, user, type DbExecutor } from '@storix/db'
import { and, eq, inArray, sql } from 'drizzle-orm'

export {
  advanceGoal,
  ensureWeekGoal,
  listGoalContributions,
  type GoalContribution,
  type LeagueGoalRecord,
} from '@storix/db'

export interface GoalPersonRow {
  userId: string
  displayUsername: string
  avatarUploadId: string | null
  avatarColor: string | null
}

/** Reads display names and avatars of the given current league members. */
export async function listGoalPeople(
  db: DbExecutor,
  leagueId: string,
  userIds: readonly string[],
): Promise<GoalPersonRow[]> {
  if (userIds.length === 0) return []
  return db
    .select({
      userId: leagueMembers.userId,
      displayUsername: sql<string>`coalesce(${user.displayUsername}, ${user.username}, ${user.name})`,
      avatarUploadId: portraits.uploadId,
      avatarColor: portraits.dominantColor,
    })
    .from(leagueMembers)
    .innerJoin(user, eq(user.id, leagueMembers.userId))
    .leftJoin(portraits, eq(portraits.userId, leagueMembers.userId))
    .where(and(eq(leagueMembers.leagueId, leagueId), inArray(leagueMembers.userId, [...userIds])))
}

/** Returns the week whose goal banner the member already dismissed, if any. */
export async function findGoalBannerSeenWeek(
  db: DbExecutor,
  leagueId: string,
  userId: string,
): Promise<string | null> {
  const [row] = await db
    .select({ week: leagueReads.goalBannerSeenWeek })
    .from(leagueReads)
    .where(and(eq(leagueReads.leagueId, leagueId), eq(leagueReads.userId, userId)))
    .limit(1)
  return row?.week ?? null
}

/** Remembers that the member dismissed the goal banner of a week. */
export async function markGoalBannerSeen(
  db: DbExecutor,
  input: { leagueId: string; userId: string; weekKey: string },
): Promise<void> {
  await db
    .insert(leagueReads)
    .values({ leagueId: input.leagueId, userId: input.userId, goalBannerSeenWeek: input.weekKey })
    .onConflictDoUpdate({
      target: [leagueReads.leagueId, leagueReads.userId],
      set: { goalBannerSeenWeek: input.weekKey },
    })
}
