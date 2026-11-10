import { useQuery } from '@tanstack/react-query'
import { ApiError } from '@/lib/http'
import { memberProfileQueryOptions } from './members.queries'

/** A member's page data, with `isGone` when they are not a current member of the league. */
export function useMemberProfile(leagueId: string, userId: string) {
  const query = useQuery(memberProfileQueryOptions(leagueId, userId))
  const isGone = query.error instanceof ApiError && query.error.status === 404
  return { ...query, isGone }
}
