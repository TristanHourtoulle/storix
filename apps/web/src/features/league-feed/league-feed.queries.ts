import { infiniteQueryOptions, queryOptions, type QueryClient } from '@tanstack/react-query'
import { FEED_DEFAULT_LIMIT, FEED_HOME_ROWS, type FeedFilter } from '@storix/shared'
import { logger } from '@/lib/logger'
import { fetchFeed, fetchHighlights } from './league-feed.api'

/** Root key of every feed query of a league. */
export function feedQueryKey(leagueId: string) {
  return ['leagues', leagueId, 'feed'] as const
}

export function homeFeedQueryOptions(leagueId: string, filter: FeedFilter) {
  return queryOptions({
    queryKey: [...feedQueryKey(leagueId), 'home', filter],
    queryFn: () => fetchFeed(leagueId, { filter, limit: FEED_HOME_ROWS }),
  })
}

export function fullFeedInfiniteQueryOptions(leagueId: string, filter: FeedFilter) {
  return infiniteQueryOptions({
    queryKey: [...feedQueryKey(leagueId), 'all', filter],
    queryFn: ({ pageParam }) =>
      fetchFeed(leagueId, { filter, cursor: pageParam, limit: FEED_DEFAULT_LIMIT }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  })
}

export function feedHighlightsQueryOptions(leagueId: string) {
  return queryOptions({
    queryKey: [...feedQueryKey(leagueId), 'highlights'],
    queryFn: () => fetchHighlights(leagueId),
  })
}

/** Refetches the league feed after one of the viewer's own actions. */
export function refreshFeed(queryClient: QueryClient, leagueId: string): void {
  void queryClient
    .invalidateQueries({ queryKey: feedQueryKey(leagueId) })
    .catch((error: unknown) => {
      logger.warn('Feed refresh failed', { error })
    })
}
