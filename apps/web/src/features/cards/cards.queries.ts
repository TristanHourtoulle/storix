import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query'
import { fetchCardDetail, fetchCardPage } from './cards.api'

export function cardsInfiniteQueryOptions(leagueId: string, authorId: string | null) {
  return infiniteQueryOptions({
    queryKey: ['leagues', leagueId, 'cards', { authorId }],
    queryFn: ({ pageParam }) => fetchCardPage(leagueId, { authorId, cursor: pageParam }),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  })
}

export function cardDetailQueryOptions(leagueId: string, cardId: string) {
  return queryOptions({
    queryKey: ['leagues', leagueId, 'cards', 'detail', cardId],
    queryFn: () => fetchCardDetail(leagueId, cardId),
  })
}
