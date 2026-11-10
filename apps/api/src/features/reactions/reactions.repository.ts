import { leagueMembers, reactions, user, type DbExecutor } from '@storix/db'
import {
  REACTION_TYPES,
  type CardReactor,
  type ReactionCounts,
  type ReactionType,
} from '@storix/shared'
import { and, desc, eq, sql } from 'drizzle-orm'

export interface ReactionKey {
  cardId: string
  userId: string
  type: ReactionType
}

/** Counts each reaction type on a card and whether the viewer gave it. */
export async function countReactions(
  db: DbExecutor,
  input: { cardId: string; viewerId: string },
): Promise<ReactionCounts> {
  const rows = await db
    .select({
      type: reactions.type,
      count: sql<number>`count(*)::int`,
      isMine: sql<boolean>`bool_or(${reactions.userId} = ${input.viewerId})`,
    })
    .from(reactions)
    .where(eq(reactions.cardId, input.cardId))
    .groupBy(reactions.type)
  const byType = new Map(rows.map((row) => [row.type, row]))
  const countOf = (type: ReactionType) => {
    const row = byType.get(type)
    return { count: row?.count ?? 0, isMine: row?.isMine ?? false }
  }
  return { fire: countOf('fire'), heart: countOf('heart'), star: countOf('star') }
}

/** Adds a reaction, doing nothing when the member already gave it. */
export async function addReaction(db: DbExecutor, key: ReactionKey): Promise<void> {
  await db.insert(reactions).values(key).onConflictDoNothing()
}

/** Removes a reaction when the member gave it. */
export async function removeReaction(db: DbExecutor, key: ReactionKey): Promise<void> {
  await db
    .delete(reactions)
    .where(
      and(
        eq(reactions.cardId, key.cardId),
        eq(reactions.userId, key.userId),
        eq(reactions.type, key.type),
      ),
    )
}

function isReactionType(value: string): value is ReactionType {
  return (REACTION_TYPES as readonly string[]).includes(value)
}

/**
 * Lists who reacted to a card, one row per person with their reaction types, latest reaction first.
 * A reactor who is no longer a member of the league has no name.
 */
export async function listReactors(
  db: DbExecutor,
  input: { leagueId: string; cardId: string },
): Promise<CardReactor[]> {
  const lastReactedAt = sql<Date>`max(${reactions.createdAt})`
  const rows = await db
    .select({
      userId: reactions.userId,
      memberId: leagueMembers.userId,
      displayUsername: user.displayUsername,
      types: sql<string[]>`array_agg(${reactions.type}::text order by ${reactions.type})`,
      lastReactedAt,
    })
    .from(reactions)
    .innerJoin(user, eq(user.id, reactions.userId))
    .leftJoin(
      leagueMembers,
      and(eq(leagueMembers.leagueId, input.leagueId), eq(leagueMembers.userId, reactions.userId)),
    )
    .where(eq(reactions.cardId, input.cardId))
    .groupBy(reactions.userId, leagueMembers.userId, user.displayUsername)
    .orderBy(desc(lastReactedAt))
  return rows.map((row) => ({
    person:
      row.memberId === null
        ? { userId: null, displayUsername: null }
        : { userId: row.userId, displayUsername: row.displayUsername },
    types: row.types.filter(isReactionType),
    lastReactedAt: new Date(row.lastReactedAt).toISOString(),
  }))
}
