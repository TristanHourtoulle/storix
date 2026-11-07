import { queryOptions } from '@tanstack/react-query'
import { ApiError } from '@/lib/http'
import { fetchRecentReveals, fetchWallet, openBooster } from './game.api'

export function walletQueryOptions(leagueId: string) {
  return queryOptions({
    queryKey: ['leagues', leagueId, 'wallet'],
    queryFn: () => fetchWallet(leagueId),
    staleTime: 30_000,
  })
}

export function recentRevealsQueryOptions(leagueId: string) {
  return queryOptions({
    queryKey: ['leagues', leagueId, 'reveals'],
    queryFn: () => fetchRecentReveals(leagueId),
  })
}

export function boosterOpeningQueryOptions(leagueId: string, requestId: string) {
  return queryOptions({
    queryKey: ['leagues', leagueId, 'boosters', requestId],
    queryFn: () => openBooster(leagueId, requestId),
    staleTime: Infinity,
    gcTime: 30 * 60_000,
    retry: (failureCount, error) =>
      !(error instanceof ApiError && error.status < 500) && failureCount < 3,
  })
}
