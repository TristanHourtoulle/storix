import { useQuery } from '@tanstack/react-query'
import { memberProfileQueryOptions } from './members.queries'

/** A member's page data; 404 when they left the league. */
export function useMemberProfile(leagueId: string, userId: string) {
  return useQuery(memberProfileQueryOptions(leagueId, userId))
}
