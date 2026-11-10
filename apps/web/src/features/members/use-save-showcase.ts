import { useMutation, useQueryClient } from '@tanstack/react-query'
import { logger } from '@/lib/logger'
import { resetShowcase, saveShowcase } from './member-profile.api'
import { memberProfileQueryOptions } from './members.queries'

/** Saves or resets the viewer's showcase, then refreshes their page. */
export function useSaveShowcase(leagueId: string, userId: string) {
  const queryClient = useQueryClient()
  const refresh = () =>
    queryClient.invalidateQueries({
      queryKey: memberProfileQueryOptions(leagueId, userId).queryKey,
    })
  const save = useMutation({
    mutationFn: (cardIds: readonly string[]) => saveShowcase(leagueId, cardIds),
    onSuccess: refresh,
    onError: (error) => logger.warn('Saving showcase failed', { error }),
  })
  const reset = useMutation({
    mutationFn: () => resetShowcase(leagueId),
    onSuccess: refresh,
    onError: (error) => logger.warn('Resetting showcase failed', { error }),
  })
  return { save, reset }
}
