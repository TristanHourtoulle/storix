import { queryOptions, type QueryClient } from '@tanstack/react-query'
import { logger } from '@/lib/logger'
import { fetchMemberEmblems, fetchUnseenEmblems } from './emblems.api'

const UNSEEN_STALE_TIME_MS = 30_000

/** Root key of every emblem query of a league. */
export function emblemsQueryKey(leagueId: string) {
  return ['leagues', leagueId, 'emblems'] as const
}

export function memberEmblemsQueryOptions(leagueId: string, userId: string) {
  return queryOptions({
    queryKey: [...emblemsQueryKey(leagueId), 'member', userId],
    queryFn: () => fetchMemberEmblems(leagueId, userId),
  })
}

export function unseenEmblemsQueryOptions(leagueId: string) {
  return queryOptions({
    queryKey: [...emblemsQueryKey(leagueId), 'unseen'],
    queryFn: () => fetchUnseenEmblems(leagueId),
    staleTime: UNSEEN_STALE_TIME_MS,
  })
}

/** Refreshes the emblem queries of a league after an action that may unlock one. */
export function refreshEmblems(queryClient: QueryClient, leagueId: string): void {
  void queryClient
    .invalidateQueries({ queryKey: emblemsQueryKey(leagueId) })
    .catch((error: unknown) => {
      logger.warn('Emblems refresh failed', { error })
    })
}
