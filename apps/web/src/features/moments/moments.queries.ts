import { queryOptions } from '@tanstack/react-query'
import { fetchCurrentMoment } from './moments.api'

const POLL_MS = 30_000

/** Root key of the current Moment query of a league. */
export function currentMomentQueryKey(leagueId: string) {
  return ['leagues', leagueId, 'moments', 'current'] as const
}

/** Polls the current Moment so an open app notices when it fires, even without a push. */
export function currentMomentQueryOptions(leagueId: string) {
  return queryOptions({
    queryKey: currentMomentQueryKey(leagueId),
    queryFn: () => fetchCurrentMoment(leagueId),
    staleTime: POLL_MS / 2,
    refetchInterval: POLL_MS,
    refetchOnWindowFocus: 'always',
  })
}
