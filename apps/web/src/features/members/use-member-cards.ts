import { useMemo } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import type { CollectionCard } from '@storix/shared'
import { cardsInfiniteQueryOptions } from '@/features/cards/cards.queries'

export interface MemberCardsScope {
  authorId: string | null
  taggedUserId: string | null
  revealOwn: boolean
}

/** One member's cards as a paged collection: their photos or the photos they are tagged on. */
export function useMemberCards(leagueId: string, scope: MemberCardsScope) {
  const query = useInfiniteQuery(
    cardsInfiniteQueryOptions(leagueId, {
      authorId: scope.authorId,
      tier: null,
      upgradable: false,
      taggedUserId: scope.taggedUserId,
      revealOwn: scope.revealOwn,
      sort: 'number',
    }),
  )
  const cards = useMemo<readonly CollectionCard[]>(
    () => [
      ...new Map(
        (query.data?.pages ?? []).flatMap((page) => page.cards).map((card) => [card.id, card]),
      ).values(),
    ],
    [query.data],
  )
  const firstPage = query.data?.pages[0]
  return {
    ...query,
    cards,
    total: firstPage?.total ?? 0,
    owned: firstPage?.ownedCount ?? 0,
  }
}
