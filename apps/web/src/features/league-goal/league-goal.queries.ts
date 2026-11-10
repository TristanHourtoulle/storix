import { queryOptions, type QueryClient } from '@tanstack/react-query'
import { logger } from '@/lib/logger'
import { fetchGoalContributors, fetchLeagueGoal } from './league-goal.api'

/** Root key of every league goal query of a league. */
export function leagueGoalQueryKey(leagueId: string) {
  return ['leagues', leagueId, 'goal'] as const
}

export function leagueGoalQueryOptions(leagueId: string) {
  return queryOptions({
    queryKey: [...leagueGoalQueryKey(leagueId), 'current'],
    queryFn: () => fetchLeagueGoal(leagueId),
  })
}

export function goalContributorsQueryOptions(leagueId: string) {
  return queryOptions({
    queryKey: [...leagueGoalQueryKey(leagueId), 'contributors'],
    queryFn: () => fetchGoalContributors(leagueId),
  })
}

/** Refetches the league goal after an action that may count toward it. */
export function refreshLeagueGoal(queryClient: QueryClient, leagueId: string): void {
  void queryClient
    .invalidateQueries({ queryKey: leagueGoalQueryKey(leagueId) })
    .catch((error: unknown) => {
      logger.warn('League goal refresh failed', { error })
    })
}
