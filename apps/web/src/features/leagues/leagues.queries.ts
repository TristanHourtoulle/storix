import { queryOptions, type QueryClient } from '@tanstack/react-query'
import type { LeagueDetail } from '@storix/shared'
import { ApiError } from '@/lib/http'
import { fetchLeagueDetail } from './leagues.api'

export function leagueDetailQueryOptions(leagueId: string) {
  return queryOptions({
    queryKey: ['leagues', leagueId],
    queryFn: () => fetchLeagueDetail(leagueId),
  })
}

/** Loads a league detail into the cache; resolves null when the user cannot access it. */
export async function loadLeagueDetail(
  queryClient: QueryClient,
  leagueId: string,
): Promise<LeagueDetail | null> {
  try {
    return await queryClient.ensureQueryData(leagueDetailQueryOptions(leagueId))
  } catch (error) {
    if (error instanceof ApiError && (error.status === 403 || error.status === 404)) return null
    throw error
  }
}
