import { queryOptions, useQuery } from '@tanstack/react-query'
import { fetchRarityHistory } from './cards.api'

export function rarityHistoryQueryOptions(leagueId: string, cardId: string) {
  return queryOptions({
    queryKey: ['leagues', leagueId, 'cards', 'detail', cardId, 'rarity-history'] as const,
    queryFn: () => fetchRarityHistory(leagueId, cardId),
    retry: false,
  })
}

/** Loads the rarity journey of an owned card, lazily from the bottom of the vitrine. */
export function useRarityHistory(leagueId: string, cardId: string) {
  return useQuery(rarityHistoryQueryOptions(leagueId, cardId))
}
