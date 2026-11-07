import { leagueMembers, type DbExecutor } from '@storix/db'
import type { LeagueRole } from '@storix/shared'
import { and, eq } from 'drizzle-orm'

export interface MembershipRecord {
  role: LeagueRole
  joinedAt: Date
}

/** Inserts a league membership. */
export async function insertMember(
  db: DbExecutor,
  input: { leagueId: string; userId: string; role: LeagueRole },
): Promise<void> {
  await db.insert(leagueMembers).values(input)
}

/** Finds a user's membership in a league. */
export async function findMembership(
  db: DbExecutor,
  leagueId: string,
  userId: string,
): Promise<MembershipRecord | null> {
  const rows = await db
    .select({ role: leagueMembers.role, joinedAt: leagueMembers.joinedAt })
    .from(leagueMembers)
    .where(and(eq(leagueMembers.leagueId, leagueId), eq(leagueMembers.userId, userId)))
    .limit(1)
  return rows[0] ?? null
}
