import { useMutation, useQueryClient } from '@tanstack/react-query'
import { refreshMissions } from '@/features/missions/missions.queries'
import { logger } from '@/lib/logger'
import { taggedCardsQueryOptions } from '@/features/withdrawals/withdrawals.queries'
import { removeCardTag, tagSelf } from './cards.api'

/** Tags the viewer on a card or removes a member's tag, refreshing the card and tag-based lists. */
export function useCardTag(leagueId: string, cardId: string) {
  const queryClient = useQueryClient()
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['leagues', leagueId, 'cards'] }),
      queryClient.invalidateQueries({ queryKey: ['leagues', leagueId, 'members'] }),
      queryClient.invalidateQueries({ queryKey: taggedCardsQueryOptions(leagueId).queryKey }),
    ])
  const add = useMutation({
    mutationFn: () => tagSelf(leagueId, cardId),
    onSuccess: async () => {
      refreshMissions(queryClient, leagueId)
      await refresh()
    },
    onError: (error) => logger.warn('Self tag failed', { error }),
  })
  const remove = useMutation({
    mutationFn: (userId: string) => removeCardTag(leagueId, cardId, userId),
    onSuccess: refresh,
    onError: (error) => logger.warn('Tag removal failed', { error }),
  })
  return { add, remove }
}
