import {
  feedBravoSchema,
  feedHighlightsSchema,
  feedPageSchema,
  type FeedBravo,
  type FeedFilter,
  type FeedHighlights,
  type FeedPage,
} from '@storix/shared'
import { apiRequest, apiRequestVoid } from '@/lib/http'

function feedPath(leagueId: string): string {
  return `/api/leagues/${encodeURIComponent(leagueId)}/feed`
}

/** Fetches one page of grouped league feed rows, newest first. */
export function fetchFeed(
  leagueId: string,
  input: { filter: FeedFilter; cursor?: string; limit: number },
): Promise<FeedPage> {
  const query = new URLSearchParams({ filter: input.filter, limit: String(input.limit) })
  if (input.cursor !== undefined) query.set('cursor', input.cursor)
  return apiRequest(`${feedPath(leagueId)}?${query.toString()}`, { schema: feedPageSchema })
}

/** Records that the viewer has seen the feed up to now. */
export function markFeedSeen(leagueId: string): Promise<void> {
  return apiRequestVoid(`${feedPath(leagueId)}/seen`, { method: 'POST', keepalive: true })
}

/** Sends the viewer's single Bravo on a promotion event. */
export function sendBravo(leagueId: string, eventId: string): Promise<FeedBravo> {
  return apiRequest(`${feedPath(leagueId)}/events/${encodeURIComponent(eventId)}/bravo`, {
    method: 'PUT',
    schema: feedBravoSchema,
  })
}

/** Fetches the Mythic ★ promotions the viewer has not been shown yet. */
export function fetchHighlights(leagueId: string): Promise<FeedHighlights> {
  return apiRequest(`${feedPath(leagueId)}/highlights`, { schema: feedHighlightsSchema })
}

/** Records that the viewer has seen the Mythic ★ highlights. */
export function markHighlightsSeen(leagueId: string): Promise<void> {
  return apiRequestVoid(`${feedPath(leagueId)}/highlights/seen`, { method: 'POST' })
}
