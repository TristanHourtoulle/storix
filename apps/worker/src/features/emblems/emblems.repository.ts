import { and, eq, isNull } from 'drizzle-orm'
import { leagueMembers, type DbExecutor } from '@storix/db'

export { awardEarnedEmblems } from '@storix/db'

/** Lists the user ids of a league's current members. */
export async function listMemberIds(db: DbExecutor, leagueId: string): Promise<string[]> {
  const rows = await db
    .select({ userId: leagueMembers.userId })
    .from(leagueMembers)
    .where(eq(leagueMembers.leagueId, leagueId))
  return rows.map((row) => row.userId)
}

/** Returns true when the user is still a member of the league. */
export async function isMember(
  db: DbExecutor,
  m: { leagueId: string; userId: string },
): Promise<boolean> {
  const rows = await db
    .select({ userId: leagueMembers.userId })
    .from(leagueMembers)
    .where(and(eq(leagueMembers.leagueId, m.leagueId), eq(leagueMembers.userId, m.userId)))
    .limit(1)
  return rows.length > 0
}

/** Lists the members whose emblems were never evaluated, league by league. */
export async function listUnevaluatedMembers(
  db: DbExecutor,
): Promise<{ leagueId: string; userId: string }[]> {
  return db
    .select({ leagueId: leagueMembers.leagueId, userId: leagueMembers.userId })
    .from(leagueMembers)
    .where(isNull(leagueMembers.emblemsEvaluatedAt))
    .orderBy(leagueMembers.leagueId, leagueMembers.userId)
}

/** Records that a member's emblems were evaluated at the given time. */
export async function markEmblemsEvaluated(
  db: DbExecutor,
  m: { leagueId: string; userId: string; now: Date },
): Promise<void> {
  await db
    .update(leagueMembers)
    .set({ emblemsEvaluatedAt: m.now })
    .where(and(eq(leagueMembers.leagueId, m.leagueId), eq(leagueMembers.userId, m.userId)))
}
