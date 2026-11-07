import { queryOptions } from '@tanstack/react-query'
import { fetchTaggedCards } from './withdrawals.api'

export function taggedCardsQueryOptions(leagueId: string) {
  return queryOptions({
    queryKey: ['leagues', leagueId, 'tagged-cards'],
    queryFn: () => fetchTaggedCards(leagueId),
  })
}
