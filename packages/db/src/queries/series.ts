import { and, eq, inArray, isNull, lte, sql } from 'drizzle-orm'
import {
  acceptsCards,
  mostActive,
  rotationThemeFor,
  SERIES_COMPLETE_DUST,
  SERIES_RECAP_CARDS,
  SERIES_REWARD_MIN_CARDS,
  SERIES_REWARD_WINDOW_DAYS,
  themeWeekBounds,
} from '@storix/shared/domain'
import type { DbExecutor } from '../client'
import { lockLeagueEconomyShared } from '../locks/league-locks'
import {
  auditLog,
  cardSeries,
  cardSeriesCards,
  cardSeriesRewards,
  memberWallets,
} from '../schema/index'
import { awardEarnedEmblems } from './emblems'
import { insertLeagueEvents } from './league-events'
import { ensureMemberWallets } from './wallets'

export type SeriesRecord = typeof cardSeries.$inferSelect

export interface ThemeChoice {
  title: string
  icon: string
  color: string
}

/** Returns the theme series of a league week, creating it from the rotation when it does not exist yet. */
export async function ensureThemeSeries(
  db: DbExecutor,
  input: { leagueId: string; weekKey: string },
): Promise<SeriesRecord> {
  const { start, end, graceEnd } = themeWeekBounds(input.weekKey)
  const idea = rotationThemeFor(input.leagueId, input.weekKey)
  await db
    .insert(cardSeries)
    .values({
      leagueId: input.leagueId,
      kind: 'theme',
      title: idea.title,
      icon: idea.icon,
      color: idea.color,
      weekKey: input.weekKey,
      startsAt: start,
      endsAt: end,
      graceEndsAt: graceEnd,
    })
    .onConflictDoNothing({
      target: [cardSeries.leagueId, cardSeries.weekKey],
      where: sql`${cardSeries.kind} = 'theme'`,
    })
  const found = await findThemeSeries(db, input)
  if (found === null) throw new Error(`Theme series ${input.weekKey} missing after insert`)
  return found
}

/** Returns the theme series of a league week, or null when none exists yet. */
export async function findThemeSeries(
  db: DbExecutor,
  input: { leagueId: string; weekKey: string },
): Promise<SeriesRecord | null> {
  const [row] = await db
    .select()
    .from(cardSeries)
    .where(
      and(
        eq(cardSeries.leagueId, input.leagueId),
        eq(cardSeries.kind, 'theme'),
        eq(cardSeries.weekKey, input.weekKey),
      ),
    )
    .limit(1)
  return row ?? null
}

/** Sets the theme of a week that has not started yet, replacing the rotation pick; false when it already started. */
export async function upsertThemeOverride(
  db: DbExecutor,
  input: { leagueId: string; weekKey: string; choice: ThemeChoice; userId: string; now: Date },
): Promise<boolean> {
  const { start, end, graceEnd } = themeWeekBounds(input.weekKey)
  if (start <= input.now) return false
  await db
    .insert(cardSeries)
    .values({
      leagueId: input.leagueId,
      kind: 'theme',
      ...input.choice,
      weekKey: input.weekKey,
      startsAt: start,
      endsAt: end,
      graceEndsAt: graceEnd,
      isOverride: true,
      createdById: input.userId,
    })
    .onConflictDoUpdate({
      target: [cardSeries.leagueId, cardSeries.weekKey],
      targetWhere: sql`${cardSeries.kind} = 'theme'`,
      set: { ...input.choice, isOverride: true, createdById: input.userId },
    })
  return true
}

/** Keeps the ids of series of the league that accept cards at `now`, in the given order. */
export async function filterOpenSeries(
  db: DbExecutor,
  input: { leagueId: string; seriesIds: readonly string[]; now: Date },
): Promise<string[]> {
  if (input.seriesIds.length === 0) return []
  const rows = await db
    .select()
    .from(cardSeries)
    .where(
      and(eq(cardSeries.leagueId, input.leagueId), inArray(cardSeries.id, [...input.seriesIds])),
    )
  const open = new Set(rows.filter((row) => acceptsCards(row, input.now)).map((row) => row.id))
  return input.seriesIds.filter((id) => open.has(id))
}

/** Links a card to series; already linked pairs are kept as they are. */
export async function attachCardToSeries(
  db: DbExecutor,
  input: { cardId: string; seriesIds: readonly string[]; now: Date },
): Promise<void> {
  if (input.seriesIds.length === 0) return
  await db
    .insert(cardSeriesCards)
    .values(
      input.seriesIds.map((seriesId) => ({ seriesId, cardId: input.cardId, addedAt: input.now })),
    )
    .onConflictDoNothing()
}

/** Lists the series past their grace window that are not closed yet, oldest first. */
export async function listDueSeries(db: DbExecutor, now: Date): Promise<SeriesRecord[]> {
  return db
    .select()
    .from(cardSeries)
    .where(and(isNull(cardSeries.closedAt), lte(cardSeries.graceEndsAt, now)))
    .orderBy(cardSeries.graceEndsAt)
}

type RecapRow = {
  author_id: string
  n: unknown
  first_at: unknown
}

/** Closes a due series and posts its recap in the league feed when it has cards; false when another run closed it. */
export async function closeSeries(
  db: DbExecutor,
  input: { series: SeriesRecord; now: Date },
): Promise<boolean> {
  const { series, now } = input
  const [closed] = await db
    .update(cardSeries)
    .set({ closedAt: now })
    .where(and(eq(cardSeries.id, series.id), isNull(cardSeries.closedAt)))
    .returning({ id: cardSeries.id })
  if (closed === undefined) return false
  const authors = await db.execute<RecapRow>(sql`
    SELECT c.author_id, count(*) AS n, min(sc.added_at) AS first_at
    FROM card_series_cards sc JOIN cards c ON c.id = sc.card_id AND c.status = 'active'
    WHERE sc.series_id = ${series.id} AND c.author_id IS NOT NULL
    GROUP BY c.author_id`)
  const contributions = authors.rows.map((row) => ({
    userId: row.author_id,
    cards: Number(row.n),
    firstAt: new Date(String(row.first_at)),
  }))
  const cardCount = contributions.reduce((sum, row) => sum + row.cards, 0)
  if (cardCount === 0) return true
  const top = mostActive(contributions)
  const picks = await db.execute<{ id: string }>(sql`
    SELECT c.id FROM card_series_cards sc JOIN cards c ON c.id = sc.card_id AND c.status = 'active'
    WHERE sc.series_id = ${series.id}
    ORDER BY c.tier DESC, sc.added_at ASC, c.id
    LIMIT ${SERIES_RECAP_CARDS}`)
  await insertLeagueEvents(db, [
    {
      leagueId: series.leagueId,
      actorId: top,
      type: 'series_recap',
      payload: {
        seriesId: series.id,
        seriesCardIds: picks.rows.map((row) => row.id),
        count: cardCount,
        memberCount: contributions.length,
        topCount: contributions.find((row) => row.userId === top)?.cards ?? 0,
      },
      dedupeKey: `series-recap:${series.id}`,
      visibleAt: now,
    },
  ])
  return true
}

export interface SeriesCompletion {
  seriesId: string
  leagueId: string
  userId: string
  title: string
}

/**
 * Lists current members who own every active card of a series closed within the reward window and big
 * enough for the reward, not rewarded yet. Completing a series after the window pays nothing.
 */
export async function listUnrewardedCompletions(
  db: DbExecutor,
  now: Date,
): Promise<SeriesCompletion[]> {
  const since = new Date(now.getTime() - SERIES_REWARD_WINDOW_DAYS * 86_400_000)
  const result = await db.execute<{
    series_id: string
    league_id: string
    user_id: string
    title: string
  }>(sql`
    WITH totals AS (
      SELECT s.id, s.league_id, s.title, count(*) AS total
      FROM card_series s
      JOIN card_series_cards sc ON sc.series_id = s.id
      JOIN cards c ON c.id = sc.card_id AND c.status = 'active'
      WHERE s.closed_at IS NOT NULL AND s.closed_at >= ${since}
      GROUP BY s.id
      HAVING count(*) >= ${SERIES_REWARD_MIN_CARDS}
    )
    SELECT t.id AS series_id, t.league_id, cc.owner_id AS user_id, t.title
    FROM totals t
    JOIN card_series_cards sc ON sc.series_id = t.id
    JOIN cards c ON c.id = sc.card_id AND c.status = 'active'
    JOIN card_copies cc ON cc.card_id = c.id AND cc.league_id = t.league_id
    JOIN league_members lm ON lm.league_id = t.league_id AND lm.user_id = cc.owner_id
    WHERE NOT EXISTS (
      SELECT 1 FROM card_series_rewards r WHERE r.series_id = t.id AND r.user_id = cc.owner_id
    )
    GROUP BY t.id, t.league_id, t.title, t.total, cc.owner_id
    HAVING count(DISTINCT c.id) = t.total`)
  return result.rows.map((row) => ({
    seriesId: row.series_id,
    leagueId: row.league_id,
    userId: row.user_id,
    title: row.title,
  }))
}

/** Pays a series completion once: 150 paillettes, an audit entry and the « Série complète » emblem. */
export async function rewardCompletion(
  db: DbExecutor,
  input: SeriesCompletion & { now: Date },
): Promise<boolean> {
  const { seriesId, leagueId, userId, now } = input
  await lockLeagueEconomyShared(db, leagueId)
  const inserted = await db
    .insert(cardSeriesRewards)
    .values({ seriesId, leagueId, userId, rewardedAt: now })
    .onConflictDoNothing()
    .returning({ seriesId: cardSeriesRewards.seriesId })
  if (inserted.length === 0) return false
  await ensureMemberWallets(db, { leagueId, userIds: [userId], now })
  const credited = await db
    .update(memberWallets)
    .set({ dust: sql`${memberWallets.dust} + ${SERIES_COMPLETE_DUST}`, updatedAt: now })
    .where(and(eq(memberWallets.leagueId, leagueId), eq(memberWallets.userId, userId)))
    .returning({ userId: memberWallets.userId })
  if (credited.length === 0) throw new Error(`Wallet missing for series reward ${seriesId}`)
  await db.insert(auditLog).values({
    leagueId,
    actorId: userId,
    targetUserId: null,
    action: 'series.completed',
    metadata: { seriesId, title: input.title, dust: SERIES_COMPLETE_DUST },
  })
  await awardEarnedEmblems(db, { leagueId, userId, now })
  return true
}
