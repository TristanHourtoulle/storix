import { useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { LeagueGoal } from '@storix/shared'
import { logger } from '@/lib/logger'
import { markGoalBannerSeen } from './league-goal.api'
import { leagueGoalQueryOptions } from './league-goal.queries'

/** This week's league goal, with an action to record that its banner was shown. */
export function useLeagueGoal(leagueId: string) {
  const queryClient = useQueryClient()
  const query = useQuery(leagueGoalQueryOptions(leagueId))
  const { mutate } = useMutation({
    mutationFn: () => markGoalBannerSeen(leagueId),
    onError: (error) => {
      logger.warn('Marking goal banner seen failed', { error })
    },
  })
  const markBannerSeen = useCallback(() => {
    queryClient.setQueryData<LeagueGoal>(leagueGoalQueryOptions(leagueId).queryKey, (goal) =>
      goal ? { ...goal, showBanner: false } : goal,
    )
    mutate()
  }, [queryClient, leagueId, mutate])
  return { goal: query.data, markBannerSeen }
}
