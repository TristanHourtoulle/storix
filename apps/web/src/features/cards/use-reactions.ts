import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { ReactionCounts, ReactionType, ViewerCardDetail } from '@storix/shared'
import { logger } from '@/lib/logger'
import { setReaction } from './cards.api'
import { cardDetailQueryOptions } from './cards.queries'

interface ToggleVariables {
  type: ReactionType
  isOn: boolean
}

interface ToggleContext {
  previous: ViewerCardDetail | undefined
}

function withReactions(card: ViewerCardDetail, reactions: ReactionCounts): ViewerCardDetail {
  return card.kind === 'owned' ? { ...card, reactions } : card
}

function applyToggle(reactions: ReactionCounts, { type, isOn }: ToggleVariables): ReactionCounts {
  const current = reactions[type]
  return {
    ...reactions,
    [type]: { count: Math.max(0, current.count + (isOn ? 1 : -1)), isMine: isOn },
  }
}

/** Optimistic reaction toggle on the card detail cache, rolled back on failure. */
export function useReactions(leagueId: string, cardId: string) {
  const queryClient = useQueryClient()
  const queryKey = cardDetailQueryOptions(leagueId, cardId).queryKey
  const mutationKey = ['leagues', leagueId, 'cards', cardId, 'reactions']

  function hasOtherPending(): boolean {
    return queryClient.isMutating({ mutationKey }) > 1
  }

  const mutation = useMutation<ReactionCounts, Error, ToggleVariables, ToggleContext>({
    mutationKey,
    scope: { id: `reactions-${cardId}` },
    mutationFn: ({ type, isOn }) => setReaction(leagueId, cardId, type, isOn),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<ViewerCardDetail>(queryKey)
      queryClient.setQueryData<ViewerCardDetail>(queryKey, (card) =>
        card?.kind === 'owned' ? withReactions(card, applyToggle(card.reactions, variables)) : card,
      )
      return { previous }
    },
    onError: (error, _variables, context) => {
      logger.warn('Reaction update failed', { error })
      if (hasOtherPending()) {
        void queryClient.invalidateQueries({ queryKey }).catch((cause: unknown) => {
          logger.warn('Card detail refresh failed', { error: cause })
        })
      } else if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous)
      }
    },
    onSuccess: (reactions) => {
      if (hasOtherPending()) return
      queryClient.setQueryData<ViewerCardDetail>(queryKey, (card) =>
        card ? withReactions(card, reactions) : card,
      )
    },
  })

  return {
    toggle: (type: ReactionType, isOn: boolean) => mutation.mutate({ type, isOn }),
    isError: mutation.isError,
  }
}
