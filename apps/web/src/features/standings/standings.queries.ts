import { queryOptions } from '@tanstack/react-query'
import { fetchStandings } from './standings.api'

const STANDINGS_STALE_MS = 60_000

export function standingsQueryOptions(leagueId: string) {
  return queryOptions({
    queryKey: ['leagues', leagueId, 'standings'],
    queryFn: () => fetchStandings(leagueId),
    staleTime: STANDINGS_STALE_MS,
  })
}
