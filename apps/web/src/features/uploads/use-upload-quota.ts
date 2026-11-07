import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'
import type { UploadQuota } from '@storix/shared'
import { fetchUploadQuota } from './uploads.api'

export function uploadQuotaQueryKey(leagueId: string) {
  return ['leagues', leagueId, 'uploads', 'quota'] as const
}

export function uploadQuotaQueryOptions(leagueId: string) {
  return queryOptions({
    queryKey: uploadQuotaQueryKey(leagueId),
    queryFn: () => fetchUploadQuota(leagueId),
  })
}

/** Today's upload quota of the current member; suspends until loaded. */
export function useUploadQuota(leagueId: string): UploadQuota {
  const { data } = useSuspenseQuery(uploadQuotaQueryOptions(leagueId))
  return data
}
