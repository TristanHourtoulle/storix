import { useQuery } from '@tanstack/react-query'
import type { ViewerCardDetail } from '@storix/shared'
import { ApiError } from '@/lib/http'
import { cardDetailQueryOptions } from './cards.queries'

interface CardDetailState {
  card: ViewerCardDetail | undefined
  isPending: boolean
  isMissing: boolean
  retry: () => void
}

/** Loads one card and classifies a missing card separately from other failures. */
export function useCardDetail(leagueId: string, cardId: string): CardDetailState {
  const { data, error, isPending, refetch } = useQuery(cardDetailQueryOptions(leagueId, cardId))
  const isMissing = error instanceof ApiError && (error.status === 404 || error.status === 400)

  return { card: data, isPending, isMissing, retry: () => void refetch() }
}
