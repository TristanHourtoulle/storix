import { queryOptions } from '@tanstack/react-query'
import { fetchMemberProfile } from './member-profile.api'
import { fetchMembers } from './members.api'

export function membersQueryOptions(leagueId: string) {
  return queryOptions({
    queryKey: ['leagues', leagueId, 'members'],
    queryFn: () => fetchMembers(leagueId),
  })
}

export function memberProfileQueryOptions(leagueId: string, userId: string) {
  return queryOptions({
    queryKey: ['leagues', leagueId, 'members', userId, 'profile'],
    queryFn: () => fetchMemberProfile(leagueId, userId),
  })
}
