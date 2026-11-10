import { useQuery } from '@tanstack/react-query'
import { fetchCardReactors } from './cards.api'

export function cardReactorsQueryKey(leagueId: string, cardId: string) {
  return ['leagues', leagueId, 'cards', 'detail', cardId, 'reactors'] as const
}

/** Loads who reacted to an owned card; disabled while nobody has reacted. */
export function useCardReactors(leagueId: string, cardId: string, isEnabled: boolean) {
  return useQuery({
    queryKey: cardReactorsQueryKey(leagueId, cardId),
    queryFn: () => fetchCardReactors(leagueId, cardId),
    enabled: isEnabled,
    retry: false,
  })
}
