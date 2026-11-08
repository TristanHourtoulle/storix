import { useEffect, useMemo, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  portraitOwnerPrefix,
  portraitPrefixOfMediaUrl,
  type PortraitCacheOwner,
  type PortraitOwner,
} from '@storix/shared/domain'
import type { Portrait } from '@storix/shared'
import { meQueryOptions } from '@/features/auth/session.queries'
import { membersQueryOptions } from '@/features/members/members.queries'
import { prunePortraitCache } from './portrait-cache'

function ownerOf(owner: PortraitOwner, current: Portrait | null): PortraitCacheOwner {
  return {
    ownerPrefix: portraitOwnerPrefix(owner),
    currentPrefix: current ? portraitPrefixOfMediaUrl(current.url) : null,
  }
}

function ownerKey({ ownerPrefix, currentPrefix }: PortraitCacheOwner): string {
  return `${ownerPrefix}=${currentPrefix ?? ''}`
}

/** Prunes cached portrait images of the user, their leagues and the cached members that are no longer current. */
export function usePortraitCachePruning(leagueId: string): void {
  const { data: me } = useQuery(meQueryOptions)
  const { data: members } = useQuery({ ...membersQueryOptions(leagueId), enabled: false })

  const owners = useMemo((): PortraitCacheOwner[] => {
    if (!me) return []
    const own = ownerOf({ kind: 'avatar', ownerId: me.user.id }, me.avatar)
    const leagues = me.leagues.map((league) =>
      ownerOf({ kind: 'league', ownerId: league.id }, league.photo),
    )
    const others = (members ?? [])
      .filter((member) => member.userId !== me.user.id)
      .map((member) => ownerOf({ kind: 'avatar', ownerId: member.userId }, member.avatar))
    return [own, ...leagues, ...others]
  }, [me, members])

  const key = owners.map(ownerKey).join('|')
  const ownersRef = useRef(owners)

  useEffect(() => {
    ownersRef.current = owners
  })

  useEffect(() => {
    if (key !== '') void prunePortraitCache(ownersRef.current)
  }, [key])
}
