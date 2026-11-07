import { leagueMembers, leagues, type DbExecutor } from '@storix/db'
import type { LeagueSummary } from '@storix/shared'
import { and, asc, count, eq, inArray } from 'drizzle-orm'

export interface LeagueRecord {
  id: string
  name: string
}

/** Inserts a league and returns its id and name. */
export async function insertLeague(db: DbExecutor, name: string): Promise<LeagueRecord> {
  const rows = await db.insert(leagues).values({ name }).returning({
    id: leagues.id,
    name: leagues.name,
  })
  const row = rows[0]
  if (row === undefined) throw new Error('League insert returned no row')
  return row
}

/** Finds a league by id. */
export async function findLeagueById(db: DbExecutor, id: string): Promise<LeagueRecord | null> {
  const rows = await db
    .select({ id: leagues.id, name: leagues.name })
    .from(leagues)
    .where(eq(leagues.id, id))
    .limit(1)
  return rows[0] ?? null
}

/** Renames a league and returns its id and name, or null when the league is missing. */
export async function updateLeagueName(
  db: DbExecutor,
  id: string,
  name: string,
): Promise<LeagueRecord | null> {
  const rows = await db
    .update(leagues)
    .set({ name })
    .where(eq(leagues.id, id))
    .returning({ id: leagues.id, name: leagues.name })
  return rows[0] ?? null
}

/** Finds a league by id and locks its row for the current transaction. */
export async function lockLeagueById(db: DbExecutor, id: string): Promise<LeagueRecord | null> {
  const rows = await db
    .select({ id: leagues.id, name: leagues.name })
    .from(leagues)
    .where(eq(leagues.id, id))
    .limit(1)
    .for('update')
  return rows[0] ?? null
}

/** Lists the user's leagues with their role and member count in a single query. */
export async function listLeaguesForUser(db: DbExecutor, userId: string): Promise<LeagueSummary[]> {
  const memberCounts = db
    .select({ leagueId: leagueMembers.leagueId, total: count().as('total') })
    .from(leagueMembers)
    .groupBy(leagueMembers.leagueId)
    .as('member_counts')
  const rows = await db
    .select({
      id: leagues.id,
      name: leagues.name,
      role: leagueMembers.role,
      memberCount: memberCounts.total,
    })
    .from(leagueMembers)
    .innerJoin(leagues, eq(leagues.id, leagueMembers.leagueId))
    .innerJoin(memberCounts, eq(memberCounts.leagueId, leagueMembers.leagueId))
    .where(eq(leagueMembers.userId, userId))
    .orderBy(asc(leagueMembers.joinedAt), asc(leagues.id))
  return rows
}

/** Counts the members of a league. */
export async function countMembers(db: DbExecutor, leagueId: string): Promise<number> {
  const rows = await db
    .select({ total: count() })
    .from(leagueMembers)
    .where(eq(leagueMembers.leagueId, leagueId))
  return rows[0]?.total ?? 0
}

/** Returns the owner's user id for a league. */
export async function findOwnerId(db: DbExecutor, leagueId: string): Promise<string | null> {
  const rows = await db
    .select({ userId: leagueMembers.userId })
    .from(leagueMembers)
    .where(and(eq(leagueMembers.leagueId, leagueId), eq(leagueMembers.role, 'owner')))
    .limit(1)
  return rows[0]?.userId ?? null
}

/** Returns the owner's user id for each of the given leagues that has an owner, in one query. */
export async function findOwnerIds(
  db: DbExecutor,
  leagueIds: readonly string[],
): Promise<ReadonlyMap<string, string>> {
  if (leagueIds.length === 0) return new Map()
  const rows = await db
    .select({ leagueId: leagueMembers.leagueId, userId: leagueMembers.userId })
    .from(leagueMembers)
    .where(and(inArray(leagueMembers.leagueId, [...leagueIds]), eq(leagueMembers.role, 'owner')))
  return new Map(rows.map((row) => [row.leagueId, row.userId]))
}

/** Returns the raw settings column of a league, or null when unset or the league is missing. */
export async function findLeagueSettings(db: DbExecutor, leagueId: string): Promise<unknown> {
  const rows = await db
    .select({ settings: leagues.settings })
    .from(leagues)
    .where(eq(leagues.id, leagueId))
    .limit(1)
  return rows[0]?.settings ?? null
}
