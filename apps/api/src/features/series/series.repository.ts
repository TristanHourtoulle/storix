import { cardSeries, cardSeriesRewards, cards, type DbExecutor } from '@storix/db'
import { and, desc, eq, sql } from 'drizzle-orm'

export {
  attachCardToSeries,
  ensureThemeSeries,
  findThemeSeries,
  upsertThemeOverride,
  type SeriesRecord,
} from '@storix/db'

export type SeriesWithCounts = typeof cardSeries.$inferSelect & {
  cardCount: number
  ownedCount: number
}

export interface SeriesContributionRow {
  userId: string
  count: number
  firstAt: Date
}

const activeCardCount = sql<number>`(
  select count(*)::int from card_series_cards sc
  join cards c on c.id = sc.card_id and c.status = 'active'
  where sc.series_id = ${cardSeries.id}
)`

const hasActiveCard = sql`exists (
  select 1 from card_series_cards sc
  join cards c on c.id = sc.card_id and c.status = 'active'
  where sc.series_id = ${cardSeries.id}
)`

function ownedCardCount(viewerId: string) {
  return sql<number>`(
    select count(distinct c.id)::int from card_series_cards sc
    join cards c on c.id = sc.card_id and c.status = 'active'
    join card_copies cc on cc.card_id = c.id and cc.owner_id = ${viewerId}
    where sc.series_id = ${cardSeries.id}
  )`
}

/** Lists the league's series, newest first, with their active card count and how many the viewer owns. */
export async function listSeriesWithCounts(
  db: DbExecutor,
  input: { leagueId: string; viewerId: string; seriesId?: string; withCardsOnly?: boolean },
): Promise<SeriesWithCounts[]> {
  const rows = await db
    .select({
      series: cardSeries,
      cardCount: activeCardCount,
      ownedCount: ownedCardCount(input.viewerId),
    })
    .from(cardSeries)
    .where(
      and(
        eq(cardSeries.leagueId, input.leagueId),
        input.seriesId === undefined ? undefined : eq(cardSeries.id, input.seriesId),
        input.withCardsOnly === true ? hasActiveCard : undefined,
      ),
    )
    .orderBy(desc(cardSeries.startsAt))
  return rows.map((row) => ({
    ...row.series,
    cardCount: row.cardCount,
    ownedCount: row.ownedCount,
  }))
}

/** Lists how many active cards each current member added to a series, most first. */
export async function listSeriesContributions(
  db: DbExecutor,
  input: { leagueId: string; seriesId: string },
): Promise<SeriesContributionRow[]> {
  const result = await db.execute<{ user_id: string; n: unknown; first_at: unknown }>(sql`
    SELECT c.author_id AS user_id, count(*) AS n, min(sc.added_at) AS first_at
    FROM card_series_cards sc
    JOIN cards c ON c.id = sc.card_id AND c.status = 'active'
    JOIN league_members lm ON lm.league_id = ${input.leagueId} AND lm.user_id = c.author_id
    WHERE sc.series_id = ${input.seriesId}
    GROUP BY c.author_id
    ORDER BY count(*) DESC, min(sc.added_at) ASC`)
  return result.rows.map((row) => ({
    userId: row.user_id,
    count: Number(row.n),
    firstAt: new Date(String(row.first_at)),
  }))
}

/** Tells whether a member already received the completion reward of a series. */
export async function isRewarded(
  db: DbExecutor,
  input: { seriesId: string; userId: string },
): Promise<boolean> {
  const [row] = await db
    .select({ seriesId: cardSeriesRewards.seriesId })
    .from(cardSeriesRewards)
    .where(
      and(
        eq(cardSeriesRewards.seriesId, input.seriesId),
        eq(cardSeriesRewards.userId, input.userId),
      ),
    )
    .limit(1)
  return row !== undefined
}

/** Loads a card of the league with the fields that decide whether its author may add it to a series. */
export async function findCardForSeries(
  db: DbExecutor,
  input: { leagueId: string; cardId: string },
): Promise<{ authorId: string | null; status: 'active' | 'hidden'; createdAt: Date } | null> {
  const [row] = await db
    .select({ authorId: cards.authorId, status: cards.status, createdAt: cards.createdAt })
    .from(cards)
    .where(and(eq(cards.leagueId, input.leagueId), eq(cards.id, input.cardId)))
    .limit(1)
  return row ?? null
}
