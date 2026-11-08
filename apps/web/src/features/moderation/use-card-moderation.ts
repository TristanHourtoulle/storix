import {
  useMutation,
  useQueryClient,
  type InfiniteData,
  type UseMutationResult,
} from '@tanstack/react-query'
import type { AdminCard, AdminCardPage, CardTier, ComputedTier } from '@storix/shared'
import { ApiError } from '@/lib/http'
import { logger } from '@/lib/logger'
import {
  patchVisibility,
  putCaptureDate,
  putTierBounds,
  putTierPin,
  removeCard,
} from './moderation.api'
import { adminCardsRootKey } from './moderation.queries'

type Pages = InfiniteData<AdminCardPage, number | undefined>
type Bounds = { min: ComputedTier | null; max: ComputedTier | null }

export interface CardModeration {
  setVisibility: UseMutationResult<
    AdminCard,
    Error,
    { cardId: string; status: AdminCard['status'] }
  >
  pinTier: UseMutationResult<AdminCard, Error, { cardId: string; tier: CardTier | null }>
  setBounds: UseMutationResult<AdminCard, Error, { cardId: string } & Bounds>
  validateDate: UseMutationResult<AdminCard, Error, { cardId: string; isValidated: boolean }>
  deleteCard: UseMutationResult<void, Error, { cardId: string }>
}

function mapPages(pages: Pages, update: (page: AdminCardPage) => AdminCardPage): Pages {
  return { ...pages, pages: pages.pages.map(update) }
}

/** Admin card actions; each one patches every cached admin page without a reload. */
export function useCardModeration(
  leagueId: string,
  onCardChanged: (card: AdminCard) => void,
): CardModeration {
  const queryClient = useQueryClient()
  const rootKey = adminCardsRootKey(leagueId)

  function refreshAll(): void {
    void queryClient
      .invalidateQueries({ queryKey: rootKey })
      .catch((error: unknown) => logger.warn('Admin cards refresh failed', { error }))
    void queryClient
      .invalidateQueries({ queryKey: ['leagues', leagueId, 'cards'] })
      .catch((error: unknown) => logger.warn('Collection refresh failed', { error }))
  }

  function replaceCard(updated: AdminCard): void {
    queryClient.setQueriesData<Pages>({ queryKey: rootKey }, (pages) =>
      pages
        ? mapPages(pages, (page) => ({
            ...page,
            cards: page.cards.map((card) => (card.id === updated.id ? updated : card)),
          }))
        : pages,
    )
    onCardChanged(updated)
    refreshAll()
  }

  function dropCard(cardId: string): void {
    queryClient.setQueriesData<Pages>({ queryKey: rootKey }, (pages) =>
      pages
        ? mapPages(pages, (page) => ({
            ...page,
            cards: page.cards.filter((card) => card.id !== cardId),
          }))
        : pages,
    )
    refreshAll()
  }

  function logFailure(action: string, error: Error): void {
    logger.warn('Admin card action failed', {
      action,
      code: error instanceof ApiError ? error.code : undefined,
      status: error instanceof ApiError ? error.status : undefined,
    })
  }

  const setVisibility = useMutation({
    mutationFn: ({ cardId, status }: { cardId: string; status: AdminCard['status'] }) =>
      patchVisibility(leagueId, cardId, status),
    onSuccess: replaceCard,
    onError: (error) => logFailure('visibility', error),
  })
  const pinTier = useMutation({
    meta: { sound: 'none' },
    mutationFn: ({ cardId, tier }: { cardId: string; tier: CardTier | null }) =>
      putTierPin(leagueId, cardId, tier),
    onSuccess: replaceCard,
    onError: (error) => logFailure('tier-pin', error),
  })
  const setBounds = useMutation({
    mutationFn: ({ cardId, min, max }: { cardId: string } & Bounds) =>
      putTierBounds(leagueId, cardId, { min, max }),
    onSuccess: replaceCard,
    onError: (error) => logFailure('tier-bounds', error),
  })
  const validateDate = useMutation({
    mutationFn: ({ cardId, isValidated }: { cardId: string; isValidated: boolean }) =>
      putCaptureDate(leagueId, cardId, isValidated),
    onSuccess: replaceCard,
    onError: (error) => logFailure('capture-date', error),
  })
  const deleteCard = useMutation({
    meta: { sound: 'error-only' },
    mutationFn: ({ cardId }: { cardId: string }) => removeCard(leagueId, cardId),
    onSuccess: (_, { cardId }) => dropCard(cardId),
    onError: (error) => logFailure('delete', error),
  })

  return { setVisibility, pinTier, setBounds, validateDate, deleteCard }
}
