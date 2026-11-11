import { queryOptions } from '@tanstack/react-query'
import { fetchMyCosmetics, fetchTryOnCards } from './cosmetics.api'

const MY_COSMETICS_STALE_TIME_MS = 30_000

export const myCosmeticsQueryKey = ['me', 'cosmetics'] as const

export const myCosmeticsQueryOptions = queryOptions({
  queryKey: myCosmeticsQueryKey,
  queryFn: fetchMyCosmetics,
  staleTime: MY_COSMETICS_STALE_TIME_MS,
})

export function tryOnCardsQueryOptions(leagueId: string) {
  return queryOptions({
    queryKey: ['leagues', leagueId, 'cosmetics', 'try-on-cards'],
    queryFn: () => fetchTryOnCards(leagueId),
  })
}
