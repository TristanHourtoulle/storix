import { queryOptions } from '@tanstack/react-query'
import { fetchMembers } from './members.api'

export function membersQueryOptions(leagueId: string) {
  return queryOptions({
    queryKey: ['leagues', leagueId, 'members'],
    queryFn: () => fetchMembers(leagueId),
  })
}
