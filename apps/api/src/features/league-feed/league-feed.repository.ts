import {
  cards,
  eventBravos,
  leagueEvents,
  leagueMembers,
  leagueReads,
  media,
  user,
  type DbExecutor,
} from '@storix/db'
import type { FeedCursor, LeagueEventPayload, LeagueEventType } from '@storix/shared'
import { and, desc, eq, gt, inArray, ne, sql } from 'drizzle-orm'
import {
  historyAuthor,
  historyCardColumns,
  toHistoryCardRow,
  type HistoryCardRow,
} from '../boosters/booster-history.repository'
import { authorMembership, authorMembershipOn } from '../cards/card-author.repository'

export interface FeedEventRow {
  id: string
  type: LeagueEventType
  actorId: string | null
  cardId: string | null
  payload: LeagueEventPayload
  visibleAt: Date
}

export interface FeedActorRow {
  userId: string
  displayUsername: string | null
  isMember: boolean
}

export interface BravoStatsRow {
  eventId: string
  bravoCount: number
  hasBravoed: boolean
}

type ReadColumn = 'feedSeenAt' | 'mythicBannerSeenAt' | 'journalSeenAt'

const visibleAtMs = sql`date_trunc('milliseconds', ${leagueEvents.visibleAt})`

const eventColumns = {
  id: leagueEvents.id,
  type: leagueEvents.type,
  actorId: leagueEvents.actorId,
  cardId: leagueEvents.cardId,
  payload: leagueEvents.payload,
  visibleAt: leagueEvents.visibleAt,
}

/** Lists visible league events newest first, from the cursor event included, fetching `limit` rows. */
export async function listFeedEvents(
  db: DbExecutor,
  input: {
    leagueId: string
    types: readonly LeagueEventType[]
    since: Date
    now: Date
    from?: FeedCursor
    limit: number
  },
): Promise<FeedEventRow[]> {
  const from =
    input.from === undefined
      ? undefined
      : sql`(${visibleAtMs}, ${leagueEvents.id}) <= (${new Date(input.from.atMs).toISOString()}::timestamptz, ${input.from.id}::uuid)`
  return db
    .select(eventColumns)
    .from(leagueEvents)
    .where(
      and(
        eq(leagueEvents.leagueId, input.leagueId),
        inArray(leagueEvents.type, [...input.types]),
        sql`${leagueEvents.visibleAt} <= ${input.now.toISOString()}::timestamptz`,
        gt(leagueEvents.visibleAt, input.since),
        from,
      ),
    )
    .orderBy(desc(visibleAtMs), desc(leagueEvents.id))
    .limit(input.limit)
}

/** Lists the league's cards with media and author, keyed for collection views; missing ids are skipped. */
export async function listFeedCards(
  db: DbExecutor,
  input: { leagueId: string; cardIds: readonly string[] },
): Promise<HistoryCardRow[]> {
  if (input.cardIds.length === 0) return []
  const rows = await db
    .select(historyCardColumns)
    .from(cards)
    .innerJoin(media, eq(media.id, cards.mediaId))
    .leftJoin(historyAuthor, eq(historyAuthor.id, cards.authorId))
    .leftJoin(authorMembership, authorMembershipOn)
    .where(and(eq(cards.leagueId, input.leagueId), inArray(cards.id, [...input.cardIds])))
  return rows.flatMap((row) => {
    const card = toHistoryCardRow(row)
    return card === null ? [] : [card]
  })
}

/** Resolves actor names and whether each actor is still a member of the league. */
export async function listFeedActors(
  db: DbExecutor,
  input: { leagueId: string; userIds: readonly string[] },
): Promise<FeedActorRow[]> {
  if (input.userIds.length === 0) return []
  return db
    .select({
      userId: user.id,
      displayUsername: sql<
        string | null
      >`coalesce(${user.displayUsername}, ${user.username}, ${user.name})`,
      isMember: sql<boolean>`${leagueMembers.userId} is not null`,
    })
    .from(user)
    .leftJoin(
      leagueMembers,
      and(eq(leagueMembers.userId, user.id), eq(leagueMembers.leagueId, input.leagueId)),
    )
    .where(inArray(user.id, [...input.userIds]))
}

/** Counts Bravos per event and tells whether the viewer sent one. */
export async function listBravoStats(
  db: DbExecutor,
  input: { eventIds: readonly string[]; viewerId: string },
): Promise<BravoStatsRow[]> {
  if (input.eventIds.length === 0) return []
  return db
    .select({
      eventId: eventBravos.eventId,
      bravoCount: sql<number>`count(*)::int`,
      hasBravoed: sql<boolean>`bool_or(${eventBravos.userId} = ${input.viewerId})`,
    })
    .from(eventBravos)
    .where(inArray(eventBravos.eventId, [...input.eventIds]))
    .groupBy(eventBravos.eventId)
}

/** Finds one league event, or null when it is not in that league. */
export async function findLeagueEvent(
  db: DbExecutor,
  input: { leagueId: string; eventId: string },
): Promise<FeedEventRow | null> {
  const [row] = await db
    .select(eventColumns)
    .from(leagueEvents)
    .where(and(eq(leagueEvents.id, input.eventId), eq(leagueEvents.leagueId, input.leagueId)))
  return row ?? null
}

/** Records a Bravo once per user and event. */
export async function insertBravo(
  db: DbExecutor,
  input: { eventId: string; userId: string; now: Date },
): Promise<void> {
  await db
    .insert(eventBravos)
    .values({ eventId: input.eventId, userId: input.userId, createdAt: input.now })
    .onConflictDoNothing()
}

/** Lists Mythic promotions by other members made visible after the given time, newest first. */
export async function listMythicPromotions(
  db: DbExecutor,
  input: { leagueId: string; viewerId: string; after: Date | null; since: Date; now: Date },
): Promise<FeedEventRow[]> {
  const after = input.after ?? input.since
  return db
    .select(eventColumns)
    .from(leagueEvents)
    .where(
      and(
        eq(leagueEvents.leagueId, input.leagueId),
        eq(leagueEvents.type, 'card_promoted'),
        sql`${leagueEvents.payload}->>'toTier' = 'mythic'`,
        ne(leagueEvents.actorId, input.viewerId),
        gt(leagueEvents.visibleAt, after),
        sql`${leagueEvents.visibleAt} <= ${input.now.toISOString()}::timestamptz`,
      ),
    )
    .orderBy(desc(leagueEvents.visibleAt))
    .limit(5)
}

/** Reads one of the member's league "seen" timestamps, null when never set. */
export async function findReadAt(
  db: DbExecutor,
  input: { leagueId: string; userId: string; column: ReadColumn },
): Promise<Date | null> {
  const [row] = await db
    .select({ at: leagueReads[input.column] })
    .from(leagueReads)
    .where(and(eq(leagueReads.leagueId, input.leagueId), eq(leagueReads.userId, input.userId)))
  return row?.at ?? null
}

/** Sets one of the member's league "seen" timestamps. */
export async function markReadAt(
  db: DbExecutor,
  input: { leagueId: string; userId: string; column: ReadColumn; at: Date },
): Promise<void> {
  const set: Partial<Record<ReadColumn, Date>> = { [input.column]: input.at }
  await db
    .insert(leagueReads)
    .values({ leagueId: input.leagueId, userId: input.userId, ...set })
    .onConflictDoUpdate({ target: [leagueReads.leagueId, leagueReads.userId], set })
}
