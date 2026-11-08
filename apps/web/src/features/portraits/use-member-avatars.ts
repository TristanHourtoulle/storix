import { useQuery } from '@tanstack/react-query'
import type { MemberSummary, Portrait } from '@storix/shared'
import { membersQueryOptions } from '@/features/members/members.queries'

const EMPTY: ReadonlyMap<string, Portrait> = new Map()

function toAvatarMap(members: MemberSummary[]): ReadonlyMap<string, Portrait> {
  return new Map(
    members.flatMap((member) => (member.avatar ? [[member.userId, member.avatar] as const] : [])),
  )
}

/** Maps each member of the league with an avatar to that avatar, from the members query. */
export function useMemberAvatars(leagueId: string): ReadonlyMap<string, Portrait> {
  const { data } = useQuery({ ...membersQueryOptions(leagueId), select: toAvatarMap })
  return data ?? EMPTY
}
