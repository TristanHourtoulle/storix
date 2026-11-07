import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { ReactionCounts, ReactionType, ViewerCardDetail } from '@storix/shared'
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

  const mutation = useMutation<ReactionCounts, Error, ToggleVariables, ToggleContext>({
    mutationFn: ({ type, isOn }) => setReaction(leagueId, cardId, type, isOn),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<ViewerCardDetail>(queryKey)
      queryClient.setQueryData<ViewerCardDetail>(queryKey, (card) =>
        card?.kind === 'owned' ? withReactions(card, applyToggle(card.reactions, variables)) : card,
      )
      return { previous }
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous)
    },
    onSuccess: (reactions) => {
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
