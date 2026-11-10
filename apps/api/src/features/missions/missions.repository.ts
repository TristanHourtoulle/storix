import { leagueMembers, memberMissions, memberPageVisits, type DbExecutor } from '@storix/db'
import { and, eq } from 'drizzle-orm'

export {
  claimMission,
  deriveMissionProgress,
  ensurePeriodMissions,
  listPeriodMissions,
  missionSeed,
  type MissionRecord,
} from '@storix/db'

/** Locks a member's mission rows of one period for a reroll decision. */
export async function lockPeriodMissions(
  db: DbExecutor,
  input: { leagueId: string; userId: string; period: 'day' | 'week'; key: string },
): Promise<(typeof memberMissions.$inferSelect)[]> {
  return db
    .select()
    .from(memberMissions)
    .where(
      and(
        eq(memberMissions.leagueId, input.leagueId),
        eq(memberMissions.userId, input.userId),
        eq(memberMissions.period, input.period),
        eq(memberMissions.periodKey, input.key),
      ),
    )
    .for('update')
}

/** Replaces a daily mission slot with a rerolled mission that starts now. */
export async function replaceMission(
  db: DbExecutor,
  input: {
    id: string
    missionId: string
    target: number
    rewardDust: number
    rewardBoosters: number
    now: Date
  },
): Promise<typeof memberMissions.$inferSelect> {
  const [row] = await db
    .update(memberMissions)
    .set({
      missionId: input.missionId,
      target: input.target,
      rewardDust: input.rewardDust,
      rewardBoosters: input.rewardBoosters,
      startedAt: input.now,
      rerolledAt: input.now,
    })
    .where(eq(memberMissions.id, input.id))
    .returning()
  if (row === undefined) throw new Error('Mission row disappeared during reroll')
  return row
}

/** Returns true when the user is a current member of the league. */
export async function isLeagueMember(
  db: DbExecutor,
  leagueId: string,
  userId: string,
): Promise<boolean> {
  const rows = await db
    .select({ userId: leagueMembers.userId })
    .from(leagueMembers)
    .where(and(eq(leagueMembers.leagueId, leagueId), eq(leagueMembers.userId, userId)))
    .limit(1)
  return rows.length > 0
}

/** Records that a member opened another member's page today; repeated visits are ignored. */
export async function insertMemberPageVisit(
  db: DbExecutor,
  input: { leagueId: string; visitorId: string; visitedId: string; dayKey: string; now: Date },
): Promise<void> {
  await db
    .insert(memberPageVisits)
    .values({
      leagueId: input.leagueId,
      visitorId: input.visitorId,
      visitedId: input.visitedId,
      dayKey: input.dayKey,
      createdAt: input.now,
    })
    .onConflictDoNothing()
}
