import { useQuery } from '@tanstack/react-query'
import type { CosmeticItemId, MemberSummary } from '@storix/shared'
import { membersQueryOptions } from '@/features/members/members.queries'

const EMPTY: ReadonlyMap<string, CosmeticItemId> = new Map()

function toFrameMap(members: MemberSummary[]): ReadonlyMap<string, CosmeticItemId> {
  return new Map(
    members.flatMap((member) =>
      member.avatarFrame ? [[member.userId, member.avatarFrame] as const] : [],
    ),
  )
}

/** Maps each member of the league wearing an avatar frame to that frame, from the members query. */
export function useMemberAvatarFrames(leagueId: string): ReadonlyMap<string, CosmeticItemId> {
  const { data } = useQuery({ ...membersQueryOptions(leagueId), select: toFrameMap })
  return data ?? EMPTY
}
