import { queryOptions, type QueryClient } from '@tanstack/react-query'
import { logger } from '@/lib/logger'
import { fetchMissions } from './missions.api'

/** Root key of the missions query of a league. */
export function missionsQueryKey(leagueId: string) {
  return ['leagues', leagueId, 'missions'] as const
}

export function missionsQueryOptions(leagueId: string) {
  return queryOptions({
    queryKey: missionsQueryKey(leagueId),
    queryFn: () => fetchMissions(leagueId),
  })
}

/** Refetches the viewer's missions after an action that may move their progress. */
export function refreshMissions(queryClient: QueryClient, leagueId: string): void {
  void queryClient
    .invalidateQueries({ queryKey: missionsQueryKey(leagueId) })
    .catch((error: unknown) => {
      logger.warn('Missions refresh failed', { error })
    })
}
