import { cardSeries, type DbExecutor } from '@storix/db'
import { nextThemeWeekKey, type FeedSeries, type LeagueEventPayload } from '@storix/shared'
import { and, eq, inArray } from 'drizzle-orm'

export interface FeedSeriesRef {
  id: string
  title: string
  emoji: string
  color: string
  next: FeedSeries['next']
}

/** Loads the series named by recap events with, for a theme, the theme of the following week. */
export async function listFeedSeries(
  db: DbExecutor,
  input: { leagueId: string; seriesIds: readonly string[] },
): Promise<Map<string, FeedSeriesRef>> {
  if (input.seriesIds.length === 0) return new Map()
  const rows = await db
    .select()
    .from(cardSeries)
    .where(
      and(eq(cardSeries.leagueId, input.leagueId), inArray(cardSeries.id, [...input.seriesIds])),
    )
  const nextKeys = rows.flatMap((row) =>
    row.weekKey === null ? [] : [nextThemeWeekKey(row.weekKey)],
  )
  const nextRows =
    nextKeys.length === 0
      ? []
      : await db
          .select()
          .from(cardSeries)
          .where(
            and(
              eq(cardSeries.leagueId, input.leagueId),
              eq(cardSeries.kind, 'theme'),
              inArray(cardSeries.weekKey, nextKeys),
            ),
          )
  const byWeek = new Map(nextRows.map((row) => [row.weekKey, row]))
  return new Map(
    rows.map((row) => {
      const next = row.weekKey === null ? undefined : byWeek.get(nextThemeWeekKey(row.weekKey))
      return [
        row.id,
        {
          id: row.id,
          title: row.title,
          emoji: row.emoji,
          color: row.color,
          next:
            next === undefined ? null : { title: next.title, emoji: next.emoji, color: next.color },
        },
      ]
    }),
  )
}

/** Builds the series block of a recap row from its stored counters. */
export function toFeedSeries(
  ref: FeedSeriesRef | undefined,
  payload: LeagueEventPayload,
): FeedSeries | null {
  if (ref === undefined) return null
  return {
    ...ref,
    cardCount: payload.count ?? 0,
    memberCount: payload.memberCount ?? 0,
    topCount: payload.topCount ?? 0,
  }
}
