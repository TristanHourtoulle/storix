import { queryOptions } from '@tanstack/react-query'
import { fetchWhatsNew, fetchWhatsNewTargets } from './whats-new.api'

const STATE_STALE_TIME_MS = 5 * 60 * 1000
const TARGETS_STALE_TIME_MS = 60 * 1000

export function whatsNewQueryOptions() {
  return queryOptions({
    queryKey: ['whats-new'],
    queryFn: fetchWhatsNew,
    staleTime: STATE_STALE_TIME_MS,
  })
}

export function whatsNewTargetsQueryOptions(leagueId: string) {
  return queryOptions({
    queryKey: ['whats-new', 'targets', leagueId],
    queryFn: () => fetchWhatsNewTargets(leagueId),
    staleTime: TARGETS_STALE_TIME_MS,
  })
}
