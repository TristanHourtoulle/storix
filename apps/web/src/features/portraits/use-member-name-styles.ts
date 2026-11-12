import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { CosmeticItemId, MemberSummary } from '@storix/shared'
import { meQueryOptions } from '@/features/auth/session.queries'
import { useEquippedStyle } from '@/features/cosmetics/style-context'
import { membersQueryOptions } from '@/features/members/members.queries'

const EMPTY: ReadonlyMap<string, CosmeticItemId> = new Map()

function toNameStyleMap(members: MemberSummary[]): ReadonlyMap<string, CosmeticItemId> {
  return new Map(
    members.flatMap((member) =>
      member.nameStyle ? [[member.userId, member.nameStyle] as const] : [],
    ),
  )
}

/**
 * Maps each member of the league wearing a name reflection to it, from the members query; the
 * viewer's own entry follows what they wear right now.
 */
export function useMemberNameStyles(leagueId: string): ReadonlyMap<string, CosmeticItemId> {
  const { data } = useQuery({ ...membersQueryOptions(leagueId), select: toNameStyleMap })
  const meId = useQuery(meQueryOptions).data?.user.id
  const own = useEquippedStyle().nameStyle
  return useMemo(() => {
    const styles = data ?? EMPTY
    if (meId === undefined) return styles
    const withoutMe = [...styles].filter(([userId]) => userId !== meId)
    return new Map(own === null ? withoutMe : [...withoutMe, [meId, own]])
  }, [data, meId, own])
}
