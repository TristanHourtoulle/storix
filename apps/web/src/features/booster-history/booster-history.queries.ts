import { infiniteQueryOptions } from '@tanstack/react-query'
import { fetchBoosterHistory } from './booster-history.api'

export function boosterHistoryQueryKey(leagueId: string) {
  return ['leagues', leagueId, 'booster-history'] as const
}

export function boosterHistoryInfiniteQueryOptions(leagueId: string) {
  return infiniteQueryOptions({
    queryKey: boosterHistoryQueryKey(leagueId),
    queryFn: ({ pageParam }) => fetchBoosterHistory(leagueId, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  })
}
