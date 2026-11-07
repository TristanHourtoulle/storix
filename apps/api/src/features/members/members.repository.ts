import { leagueMembers, user, type DbExecutor } from '@storix/db'
import type { LeagueRole } from '@storix/shared'
import { and, asc, eq, sql } from 'drizzle-orm'

export interface MembershipRecord {
  role: LeagueRole
  joinedAt: Date
}

export interface MemberRow {
  userId: string
  displayUsername: string
  role: LeagueRole
  joinedAt: Date
  homeLeagueId: string | null
}

/** Inserts a league membership; false when the user is already a member. */
export async function insertMember(
  db: DbExecutor,
  input: { leagueId: string; userId: string; role: LeagueRole },
): Promise<boolean> {
  const rows = await db
    .insert(leagueMembers)
    .values(input)
    .onConflictDoNothing()
    .returning({ userId: leagueMembers.userId })
  return rows.length > 0
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

/** Lists a league's members with their home league, ordered owner, admins, members, then by name. */
export function listMembers(db: DbExecutor, leagueId: string): Promise<MemberRow[]> {
  const displayName = sql<string>`coalesce(${user.displayUsername}, ${user.username}, ${user.name})`
  return db
    .select({
      userId: leagueMembers.userId,
      displayUsername: displayName,
      role: leagueMembers.role,
      joinedAt: leagueMembers.joinedAt,
      homeLeagueId: user.homeLeagueId,
    })
    .from(leagueMembers)
    .innerJoin(user, eq(user.id, leagueMembers.userId))
    .where(eq(leagueMembers.leagueId, leagueId))
    .orderBy(asc(leagueMembers.role), asc(sql`lower(${displayName})`), asc(leagueMembers.userId))
}

/** Sets a member's role in a league and returns the number of affected rows. */
export async function updateMemberRole(
  db: DbExecutor,
  leagueId: string,
  userId: string,
  role: LeagueRole,
): Promise<number> {
  const rows = await db
    .update(leagueMembers)
    .set({ role })
    .where(and(eq(leagueMembers.leagueId, leagueId), eq(leagueMembers.userId, userId)))
    .returning({ userId: leagueMembers.userId })
  return rows.length
}

/** Deletes a member from a league and returns the number of affected rows. */
export async function deleteMember(
  db: DbExecutor,
  leagueId: string,
  userId: string,
): Promise<number> {
  const rows = await db
    .delete(leagueMembers)
    .where(and(eq(leagueMembers.leagueId, leagueId), eq(leagueMembers.userId, userId)))
    .returning({ userId: leagueMembers.userId })
  return rows.length
}
