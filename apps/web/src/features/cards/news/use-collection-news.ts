import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  markAllSeen,
  markCardSeen,
  newCardIds,
  openCollectionVisit,
  type CollectionVisitState,
  type OwnedCardSummary,
} from '@storix/shared'
import { newsHeadQueryOptions } from '../cards.queries'
import {
  readCollectionVisit,
  toNewsCandidates,
  writeCollectionVisit,
} from './collection-visit-storage'

interface VisitSlot {
  key: string
  state: CollectionVisitState
}

interface CollectionNews {
  newCards: OwnedCardSummary[]
  newIds: ReadonlySet<string>
  markSeen: (cardId: string) => void
  markAll: () => void
}

function openVisit(userId: string, leagueId: string): VisitSlot {
  return {
    key: `${userId}.${leagueId}`,
    state: openCollectionVisit(readCollectionVisit(userId, leagueId)),
  }
}

/**
 * Opens the Collection visit on mount and exposes the cards discovered since the last visit, from
 * the unfiltered head of the discovery order. Marking cards seen is stored on the device.
 */
export function useCollectionNews(userId: string, leagueId: string): CollectionNews {
  const key = `${userId}.${leagueId}`
  const [slot, setSlot] = useState<VisitSlot>(() => openVisit(userId, leagueId))
  const current = slot.key === key ? slot : openVisit(userId, leagueId)
  if (current !== slot) setSlot(current)
  const { state } = current

  useEffect(() => {
    writeCollectionVisit(userId, leagueId, state)
  }, [userId, leagueId, state])

  const head = useQuery(newsHeadQueryOptions(leagueId)).data
  const candidates = useMemo(() => toNewsCandidates(head?.cards ?? []), [head])
  const newIds = useMemo(() => new Set(newCardIds(candidates, state)), [candidates, state])
  const newCards = useMemo(
    () =>
      (head?.cards ?? []).filter(
        (card): card is OwnedCardSummary => card.kind === 'owned' && newIds.has(card.id),
      ),
    [head, newIds],
  )

  const update = useCallback(
    (next: CollectionVisitState) => {
      writeCollectionVisit(userId, leagueId, next)
      setSlot({ key, state: next })
    },
    [userId, leagueId, key],
  )
  const markSeen = useCallback(
    (cardId: string) => update(markCardSeen(state, cardId)),
    [update, state],
  )
  const markAll = useCallback(
    () => update(markAllSeen(state, candidates)),
    [update, state, candidates],
  )

  return { newCards, newIds, markSeen, markAll }
}
