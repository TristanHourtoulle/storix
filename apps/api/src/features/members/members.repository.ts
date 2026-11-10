import {
  cardCopies,
  cardCopyStacks,
  cardTags,
  cards,
  leagueMembers,
  portraits,
  reactions,
  user,
  type DbExecutor,
} from '@storix/db'
import type { LeagueRole } from '@storix/shared'
import { and, asc, eq, inArray, sql } from 'drizzle-orm'

export interface MembershipRecord {
  role: LeagueRole
  joinedAt: Date
}

export interface MemberRow {
  userId: string
  displayUsername: string
  username: string | null
  role: LeagueRole
  joinedAt: Date
  homeLeagueId: string | null
  authoredCardCount: number
  avatarUploadId: string | null
  avatarColor: string | null
}

export interface MemberLock {
  userId: string
  role: LeagueRole
}

/** Inserts a league membership and returns its join time, or null when the user is already a member. */
export async function insertMember(
  db: DbExecutor,
  input: { leagueId: string; userId: string; role: LeagueRole },
): Promise<Date | null> {
  const rows = await db
    .insert(leagueMembers)
    .values(input)
    .onConflictDoNothing()
    .returning({ joinedAt: leagueMembers.joinedAt })
  return rows[0]?.joinedAt ?? null
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

/** Lists a league's members with their home league, authored card count and avatar, ordered owner, admins, members, then by name. */
export function listMembers(db: DbExecutor, leagueId: string): Promise<MemberRow[]> {
  const displayName = sql<string>`coalesce(${user.displayUsername}, ${user.username}, ${user.name})`
  return db
    .select({
      userId: leagueMembers.userId,
      displayUsername: displayName,
      username: user.username,
      role: leagueMembers.role,
      joinedAt: leagueMembers.joinedAt,
      homeLeagueId: user.homeLeagueId,
      authoredCardCount:
        sql<number>`(select count(*) from ${cards} where ${cards.leagueId} = ${leagueMembers.leagueId} and ${cards.authorId} = ${leagueMembers.userId})`.mapWith(
          Number,
        ),
      avatarUploadId: portraits.uploadId,
      avatarColor: portraits.dominantColor,
    })
    .from(leagueMembers)
    .innerJoin(user, eq(user.id, leagueMembers.userId))
    .leftJoin(portraits, eq(portraits.userId, leagueMembers.userId))
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

/** Locks the given memberships of a league in user id order and returns the ones that exist. */
export function lockMemberships(
  db: DbExecutor,
  leagueId: string,
  userIds: readonly string[],
): Promise<MemberLock[]> {
  return db
    .select({ userId: leagueMembers.userId, role: leagueMembers.role })
    .from(leagueMembers)
    .where(and(eq(leagueMembers.leagueId, leagueId), inArray(leagueMembers.userId, [...userIds])))
    .orderBy(asc(leagueMembers.userId))
    .for('update')
}

/** Hands the league from its owner to an admin: demotes the owner first, then promotes the target. */
export async function transferOwnership(
  db: DbExecutor,
  input: { leagueId: string; fromUserId: string; toUserId: string },
): Promise<void> {
  const demoted = await db
    .update(leagueMembers)
    .set({ role: 'admin' })
    .where(
      and(
        eq(leagueMembers.leagueId, input.leagueId),
        eq(leagueMembers.userId, input.fromUserId),
        eq(leagueMembers.role, 'owner'),
      ),
    )
    .returning({ userId: leagueMembers.userId })
  if (demoted.length === 0) throw new Error('League owner not found')
  const promoted = await db
    .update(leagueMembers)
    .set({ role: 'owner' })
    .where(
      and(
        eq(leagueMembers.leagueId, input.leagueId),
        eq(leagueMembers.userId, input.toUserId),
        eq(leagueMembers.role, 'admin'),
      ),
    )
    .returning({ userId: leagueMembers.userId })
  if (promoted.length === 0) throw new Error('Target admin not found')
}

/** Deletes a member's own copies and stacked copies in a league, so a departing member is never compensated. */
export async function deleteMemberCopies(
  db: DbExecutor,
  input: { leagueId: string; userId: string },
): Promise<void> {
  await db
    .delete(cardCopyStacks)
    .where(
      and(eq(cardCopyStacks.leagueId, input.leagueId), eq(cardCopyStacks.ownerId, input.userId)),
    )
  await db
    .delete(cardCopies)
    .where(and(eq(cardCopies.leagueId, input.leagueId), eq(cardCopies.ownerId, input.userId)))
}

/** Deletes a member's tags and reactions on a league's cards and drops their discovery credit, keeping the date. */
export async function clearMemberTraces(
  db: DbExecutor,
  input: { leagueId: string; userId: string },
): Promise<void> {
  const leagueCardIds = db
    .select({ id: cards.id })
    .from(cards)
    .where(eq(cards.leagueId, input.leagueId))
  await db
    .delete(cardTags)
    .where(and(eq(cardTags.userId, input.userId), inArray(cardTags.cardId, leagueCardIds)))
  await db
    .delete(reactions)
    .where(and(eq(reactions.userId, input.userId), inArray(reactions.cardId, leagueCardIds)))
  await db
    .update(cards)
    .set({ discoveredById: null })
    .where(and(eq(cards.leagueId, input.leagueId), eq(cards.discoveredById, input.userId)))
}
