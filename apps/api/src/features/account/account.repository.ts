import { cards, leagueMembers, leagues, media, uploads, user, type DbExecutor } from '@storix/db'
import { mediaVariantsSchema, type LeagueRole, type OwnedLeague } from '@storix/shared'
import { and, asc, count, eq, inArray, sql } from 'drizzle-orm'

export { lockLeagueEconomyExclusive } from '@storix/db'

export interface AuthoredCardsInLeague {
  leagueId: string
  name: string
  cardCount: number
  isMember: boolean
}

export interface OwnMembershipLock {
  leagueId: string
  role: LeagueRole
}

/** Lists the leagues the user owns with their member count, ordered by league id. */
export function listOwnedLeagues(db: DbExecutor, userId: string): Promise<OwnedLeague[]> {
  const memberCount = sql<number>`(select count(*) from ${leagueMembers} as lm where lm.league_id = ${leagueMembers.leagueId})`
  return db
    .select({
      leagueId: leagues.id,
      name: leagues.name,
      memberCount: memberCount.mapWith(Number),
    })
    .from(leagueMembers)
    .innerJoin(leagues, eq(leagues.id, leagueMembers.leagueId))
    .where(and(eq(leagueMembers.userId, userId), eq(leagueMembers.role, 'owner')))
    .orderBy(asc(leagues.id))
}

/** Lists the ids of the leagues the user belongs to, sorted. */
export async function listMembershipLeagueIds(db: DbExecutor, userId: string): Promise<string[]> {
  const rows = await db
    .select({ leagueId: leagueMembers.leagueId })
    .from(leagueMembers)
    .where(eq(leagueMembers.userId, userId))
    .orderBy(asc(leagueMembers.leagueId))
  return rows.map((row) => row.leagueId)
}

/** Locks every membership row of the user in league id order and returns them. */
export function lockOwnMemberships(db: DbExecutor, userId: string): Promise<OwnMembershipLock[]> {
  return db
    .select({ leagueId: leagueMembers.leagueId, role: leagueMembers.role })
    .from(leagueMembers)
    .where(eq(leagueMembers.userId, userId))
    .orderBy(asc(leagueMembers.leagueId))
    .for('update')
}

/** Locks league rows in id order, which blocks concurrent joins until the transaction ends. */
export async function lockLeagueRows(db: DbExecutor, leagueIds: readonly string[]): Promise<void> {
  if (leagueIds.length === 0) return
  await db
    .select({ id: leagues.id })
    .from(leagues)
    .where(inArray(leagues.id, [...leagueIds]))
    .orderBy(asc(leagues.id))
    .for('update')
}

/** Locks the user row, which blocks new rows referencing the user until the transaction ends. */
export async function lockUserRow(db: DbExecutor, userId: string): Promise<boolean> {
  const rows = await db.select({ id: user.id }).from(user).where(eq(user.id, userId)).for('update')
  return rows.length > 0
}

/** Lists the object keys of every media variant of a league. */
export async function listLeagueVariantKeys(db: DbExecutor, leagueId: string): Promise<string[]> {
  const rows = await db
    .select({ variants: media.variants })
    .from(media)
    .where(eq(media.leagueId, leagueId))
  return rows.flatMap((row) =>
    mediaVariantsSchema.parse(row.variants).map((variant) => variant.key),
  )
}

/** Counts the cards the user authored in each league, telling whether the user is still a member there, ordered by league id. */
export function countAuthoredCardsByLeague(
  db: DbExecutor,
  userId: string,
): Promise<AuthoredCardsInLeague[]> {
  return db
    .select({
      leagueId: cards.leagueId,
      name: leagues.name,
      cardCount: count(),
      isMember: sql<boolean>`${leagueMembers.userId} is not null`,
    })
    .from(cards)
    .innerJoin(leagues, eq(leagues.id, cards.leagueId))
    .leftJoin(
      leagueMembers,
      and(eq(leagueMembers.leagueId, cards.leagueId), eq(leagueMembers.userId, userId)),
    )
    .where(eq(cards.authorId, userId))
    .groupBy(cards.leagueId, leagues.name, leagueMembers.userId)
    .orderBy(asc(cards.leagueId))
}

/** Deletes a league with everything it cascades to (cards, media, copies, tombstones) and returns the object keys of the uploads it still held. */
export async function deleteLeague(db: DbExecutor, leagueId: string): Promise<string[]> {
  const leftovers = await db
    .select({ objectKey: uploads.objectKey })
    .from(uploads)
    .where(eq(uploads.leagueId, leagueId))
  await db.delete(leagues).where(eq(leagues.id, leagueId))
  return leftovers.map((row) => row.objectKey)
}

/** Deletes the user row; sessions, accounts, passkeys, memberships, tags, reactions and compensations cascade, audit and card credits are set null. */
export async function deleteUserRow(db: DbExecutor, userId: string): Promise<number> {
  const rows = await db.delete(user).where(eq(user.id, userId)).returning({ id: user.id })
  return rows.length
}
