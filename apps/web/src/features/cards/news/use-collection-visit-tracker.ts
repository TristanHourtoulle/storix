import { useEffect, useRef } from 'react'
import { useQueryClient, type QueryClient } from '@tanstack/react-query'
import { useMatchRoute } from '@tanstack/react-router'
import { closeCollectionVisit, newestDiscoveredAt } from '@storix/shared'
import { newsHeadQueryOptions } from '../cards.queries'
import {
  readCollectionVisit,
  toNewsCandidates,
  writeCollectionVisit,
} from './collection-visit-storage'

interface VisitArea {
  userId: string
  leagueId: string
  inArea: boolean
}

function closeVisit(queryClient: QueryClient, userId: string, leagueId: string): void {
  const head = queryClient.getQueryData(newsHeadQueryOptions(leagueId).queryKey)
  const newest = head === undefined ? undefined : newestDiscoveredAt(toNewsCandidates(head.cards))
  const state = readCollectionVisit(userId, leagueId)
  const next = closeCollectionVisit(state, newest)
  if (next !== state) writeCollectionVisit(userId, leagueId, next)
}

/**
 * Closes the Collection visit when the route leaves the Collection and card detail area, or when
 * the page hides while inside it, anchoring the next visit's NEW badges.
 */
export function useCollectionVisitTracker(userId: string, leagueId: string): void {
  const queryClient = useQueryClient()
  const matchRoute = useMatchRoute()
  const inArea = Boolean(
    matchRoute({ to: '/l/$leagueId/collection', params: { leagueId } }) ||
    matchRoute({ to: '/l/$leagueId/cards/$cardId' }),
  )
  const previous = useRef<VisitArea>({ userId, leagueId, inArea })

  useEffect(() => {
    const last = previous.current
    const hasLeft = !inArea || last.leagueId !== leagueId || last.userId !== userId
    if (last.inArea && hasLeft) closeVisit(queryClient, last.userId, last.leagueId)
    previous.current = { userId, leagueId, inArea }
  }, [queryClient, userId, leagueId, inArea])

  useEffect(() => {
    if (!inArea) return undefined
    const onPageHide = () => closeVisit(queryClient, userId, leagueId)
    window.addEventListener('pagehide', onPageHide)
    return () => window.removeEventListener('pagehide', onPageHide)
  }, [queryClient, userId, leagueId, inArea])
}
