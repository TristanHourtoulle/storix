import { eq } from 'drizzle-orm'
import { leagueMembers, leagues, type DbExecutor } from '@storix/db'

export { awardEarnedEmblems } from '@storix/db'

/** Lists the user ids of a league's current members. */
export async function listMemberIds(db: DbExecutor, leagueId: string): Promise<string[]> {
  const rows = await db
    .select({ userId: leagueMembers.userId })
    .from(leagueMembers)
    .where(eq(leagueMembers.leagueId, leagueId))
  return rows.map((row) => row.userId)
}

/** Lists every league id. */
export async function listLeagueIds(db: DbExecutor): Promise<string[]> {
  const rows = await db.select({ id: leagues.id }).from(leagues)
  return rows.map((row) => row.id)
}
