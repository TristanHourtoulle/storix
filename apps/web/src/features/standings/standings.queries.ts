import { queryOptions, type QueryClient } from '@tanstack/react-query'
import { logger } from '@/lib/logger'
import { fetchStandings } from './standings.api'

const STANDINGS_STALE_MS = 60_000

/** Root key of a league's standings. */
export function standingsQueryKey(leagueId: string) {
  return ['leagues', leagueId, 'standings'] as const
}

export function standingsQueryOptions(leagueId: string) {
  return queryOptions({
    queryKey: standingsQueryKey(leagueId),
    queryFn: () => fetchStandings(leagueId),
    staleTime: STANDINGS_STALE_MS,
  })
}

/** Refetches the Ligue page after an action that moves a ranking or a trophy. */
export function refreshStandings(queryClient: QueryClient, leagueId: string): void {
  void queryClient
    .invalidateQueries({ queryKey: standingsQueryKey(leagueId) })
    .catch((error: unknown) => {
      logger.warn('Standings refresh failed', { error })
    })
}
