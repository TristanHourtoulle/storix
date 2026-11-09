import type { CardTier, CollectionSort } from '@storix/shared'
import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query'
import { fetchCardDetail, fetchCardPage } from './cards.api'

export interface CollectionFilters {
  authorId: string | null
  tier: CardTier | null
  sort: CollectionSort
}

export const NEWS_HEAD_LIMIT = 100

export function cardsInfiniteQueryOptions(leagueId: string, filters: CollectionFilters) {
  return infiniteQueryOptions({
    queryKey: ['leagues', leagueId, 'cards', filters],
    queryFn: ({ pageParam }) => fetchCardPage(leagueId, { ...filters, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  })
}

/** The latest discoveries with no filter, enough to hold every card new since the last visit. */
export function newsHeadQueryOptions(leagueId: string) {
  return queryOptions({
    queryKey: ['leagues', leagueId, 'cards', 'news'],
    queryFn: () =>
      fetchCardPage(leagueId, {
        authorId: null,
        tier: null,
        sort: 'discovery',
        cursor: undefined,
        limit: NEWS_HEAD_LIMIT,
      }),
  })
}

export function cardDetailQueryOptions(leagueId: string, cardId: string) {
  return queryOptions({
    queryKey: ['leagues', leagueId, 'cards', 'detail', cardId],
    queryFn: () => fetchCardDetail(leagueId, cardId),
  })
}
