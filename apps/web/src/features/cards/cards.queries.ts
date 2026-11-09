import type { CardTier } from '@storix/shared'
import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query'
import { fetchCardDetail, fetchCardPage } from './cards.api'

export interface CollectionFilters {
  authorId: string | null
  tier: CardTier | null
}

export function cardsInfiniteQueryOptions(leagueId: string, filters: CollectionFilters) {
  return infiniteQueryOptions({
    queryKey: ['leagues', leagueId, 'cards', filters],
    queryFn: ({ pageParam }) => fetchCardPage(leagueId, { ...filters, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  })
}

export function cardDetailQueryOptions(leagueId: string, cardId: string) {
  return queryOptions({
    queryKey: ['leagues', leagueId, 'cards', 'detail', cardId],
    queryFn: () => fetchCardDetail(leagueId, cardId),
  })
}
