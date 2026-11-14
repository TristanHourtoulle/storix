import type { CardTier, CollectionSort } from '@storix/shared'
import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query'
import { fetchCardDetail, fetchCardPage } from './cards.api'

export interface CollectionFilters {
  authorId: string | null
  tier: CardTier | null
  upgradable: boolean
  moment?: boolean
  taggedUserId: string | null
  seriesId?: string | null
  revealOwn?: boolean
  sort: CollectionSort
}

export const NEWS_HEAD_LIMIT = 100

export function cardsInfiniteQueryOptions(leagueId: string, filters: CollectionFilters) {
  return infiniteQueryOptions({
    queryKey: ['leagues', leagueId, 'cards', filters] as const,
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
        taggedUserId: null,
        sort: 'discovery',
        cursor: undefined,
        limit: NEWS_HEAD_LIMIT,
      }),
  })
}

const COUNT_STALE_MS = 30_000

/** The total and owned counts of a filtered collection, read from a one-card first page. */
export function collectionCountQueryOptions(
  leagueId: string,
  filters: Pick<CollectionFilters, 'authorId' | 'tier' | 'upgradable' | 'moment' | 'taggedUserId'>,
) {
  return queryOptions({
    queryKey: ['leagues', leagueId, 'cards', 'count', filters] as const,
    queryFn: () =>
      fetchCardPage(leagueId, { ...filters, sort: 'number', cursor: undefined, limit: 1 }),
    select: (page) => ({ total: page.total, owned: page.ownedCount }),
    staleTime: COUNT_STALE_MS,
  })
}

export function cardDetailQueryOptions(leagueId: string, cardId: string) {
  return queryOptions({
    queryKey: ['leagues', leagueId, 'cards', 'detail', cardId],
    queryFn: () => fetchCardDetail(leagueId, cardId),
  })
}
