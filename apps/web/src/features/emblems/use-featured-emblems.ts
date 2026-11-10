import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { EmblemId } from '@storix/shared'
import { logger } from '@/lib/logger'
import { memberProfileQueryOptions } from '@/features/members/members.queries'
import { setFeaturedEmblems } from './emblems.api'
import { memberEmblemsQueryOptions } from './emblems.queries'

/** Saves the viewer's up to three featured emblems and refreshes their page. */
export function useFeaturedEmblems(leagueId: string, userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (emblemIds: readonly EmblemId[]) => setFeaturedEmblems(leagueId, emblemIds),
    onSuccess: (emblems) => {
      queryClient.setQueryData(memberEmblemsQueryOptions(leagueId, userId).queryKey, emblems)
      void queryClient.invalidateQueries({
        queryKey: memberProfileQueryOptions(leagueId, userId).queryKey,
      })
    },
    onError: (error) => logger.warn('Saving featured emblems failed', { error }),
  })
}
