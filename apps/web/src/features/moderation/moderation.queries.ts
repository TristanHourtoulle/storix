import { infiniteQueryOptions } from '@tanstack/react-query'
import { fetchAdminCards } from './moderation.api'
import type { AdminFilter } from './moderation.types'

export function adminCardsRootKey(leagueId: string) {
  return ['leagues', leagueId, 'admin', 'cards'] as const
}

export function adminCardsQueryOptions(leagueId: string, filter: AdminFilter) {
  return infiniteQueryOptions({
    queryKey: [...adminCardsRootKey(leagueId), filter],
    queryFn: ({ pageParam }) => fetchAdminCards(leagueId, filter, pageParam),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  })
}
