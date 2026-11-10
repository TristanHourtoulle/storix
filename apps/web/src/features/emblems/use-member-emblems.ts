import { useQuery } from '@tanstack/react-query'
import { memberEmblemsQueryOptions } from './emblems.queries'

/** A member's emblem grid: every emblem with progress, earned dates and featured choice. */
export function useMemberEmblems(leagueId: string, userId: string) {
  return useQuery(memberEmblemsQueryOptions(leagueId, userId))
}
