import { useState } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import type { AdminCard } from '@storix/shared'
import type { AdminFilter } from './moderation.types'
import { adminCardsQueryOptions } from './moderation.queries'

interface AdminCards {
  cards: AdminCard[]
  mythicCount: number
  outOfBoosterIds: ReadonlySet<string>
  isLoading: boolean
  isError: boolean
  hasNextPage: boolean
  isFetchingNextPage: boolean
  fetchNextPage: () => void
}

/** Paginated admin card list; mythicCount comes from the latest loaded page. */
export function useAdminCards(leagueId: string, filter: AdminFilter): AdminCards {
  const query = useInfiniteQuery(adminCardsQueryOptions(leagueId, filter))
  const [mountedAt] = useState(() => Date.now())
  const pages = query.data?.pages ?? []
  const cards = pages.flatMap((page) => page.cards)

  return {
    cards,
    outOfBoosterIds: new Set(
      cards
        .filter((card) => new Date(card.boosterEligibleAt).getTime() > mountedAt)
        .map((card) => card.id),
    ),
    mythicCount: pages.at(-1)?.mythicCount ?? 0,
    isLoading: query.isPending,
    isError: query.isError,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    fetchNextPage: () => void query.fetchNextPage(),
  }
}
