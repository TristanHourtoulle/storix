import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import type { FeedFilter } from '@storix/shared'
import { fullFeedInfiniteQueryOptions, homeFeedQueryOptions } from './league-feed.queries'

/** The latest grouped feed rows shown under the booster widget on Home. */
export function useHomeFeed(leagueId: string, filter: FeedFilter) {
  return useQuery({ ...homeFeedQueryOptions(leagueId, filter), placeholderData: (prev) => prev })
}

/** The full feed over the last 30 days, loaded page by page. */
export function useFullFeed(leagueId: string, filter: FeedFilter) {
  return useInfiniteQuery(fullFeedInfiniteQueryOptions(leagueId, filter))
}
