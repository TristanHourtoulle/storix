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

const AWARD_REFRESH_DELAYS_MS = [0, 3_000, 8_000] as const

/**
 * Refreshes the emblem queries of a league after an action that may unlock one.
 * Emblems are awarded by a worker job after the action commits, so the queries are refetched
 * a few times over the next seconds for the unlock banner to show without a reload.
 */
export function refreshEmblems(queryClient: QueryClient, leagueId: string): void {
  for (const delay of AWARD_REFRESH_DELAYS_MS) {
    setTimeout(() => {
      void queryClient
        .invalidateQueries({ queryKey: emblemsQueryKey(leagueId) })
        .catch((error: unknown) => {
          logger.warn('Emblems refresh failed', { error })
        })
    }, delay)
  }
}
