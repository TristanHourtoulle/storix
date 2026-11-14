import {
  nextThemeSchema,
  seriesDetailSchema,
  seriesShelfSchema,
  themeCardSchema,
  type NextTheme,
  type SeriesDetail,
  type SeriesShelf,
  type ThemeCard,
  type ThemeOverrideBody,
} from '@storix/shared'
import { apiRequest, apiRequestVoid } from '@/lib/http'

function seriesPath(leagueId: string): string {
  return `/api/leagues/${encodeURIComponent(leagueId)}/series`
}

/** Fetches the league's series shelf: the open theme first, then the closed series. */
export function fetchSeriesShelf(leagueId: string): Promise<SeriesShelf> {
  return apiRequest(seriesPath(leagueId), { schema: seriesShelfSchema })
}

/** Fetches this week's theme with its posters and the days left. */
export function fetchThemeCard(leagueId: string): Promise<ThemeCard> {
  return apiRequest(`${seriesPath(leagueId)}/theme`, { schema: themeCardSchema })
}

/** Fetches one series with its progress, reward state and next theme. */
export function fetchSeries(leagueId: string, seriesId: string): Promise<SeriesDetail> {
  return apiRequest(`${seriesPath(leagueId)}/${encodeURIComponent(seriesId)}`, {
    schema: seriesDetailSchema,
  })
}

/** Replaces next week's theme; admins only. */
export function setNextTheme(leagueId: string, body: ThemeOverrideBody): Promise<NextTheme> {
  return apiRequest(`${seriesPath(leagueId)}/theme/next`, {
    method: 'PUT',
    body,
    schema: nextThemeSchema,
  })
}

/** Adds one of the viewer's own cards published during a series to it. */
export function addCardToSeries(leagueId: string, seriesId: string, cardId: string): Promise<void> {
  return apiRequestVoid(`${seriesPath(leagueId)}/${encodeURIComponent(seriesId)}/cards`, {
    method: 'POST',
    body: { cardId },
  })
}
