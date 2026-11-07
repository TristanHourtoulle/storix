import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { walletQueryOptions } from '@/features/game/game.queries'
import { ApiError } from '@/lib/http'
import { logger } from '@/lib/logger'
import { withdrawCard } from './withdrawals.api'
import { taggedCardsQueryOptions } from './withdrawals.queries'

/** Whether a withdrawal failed because the card no longer exists. */
export function isCardGone(error: Error | null): boolean {
  return error instanceof ApiError && error.status === 404
}

/**
 * Withdraws a card, refreshes the dependent caches and returns to the collection.
 * When the card is already gone, `leaveOnGone` also sends the user to the collection.
 */
export function useWithdrawCard(
  leagueId: string,
  leaveOnGone = false,
): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  function logRefreshFailure(error: unknown): void {
    logger.warn('Withdrawal cache refresh failed', { error })
  }

  function refresh(): void {
    void queryClient
      .invalidateQueries({ queryKey: ['leagues', leagueId, 'cards'] })
      .catch(logRefreshFailure)
    void queryClient
      .invalidateQueries({ queryKey: taggedCardsQueryOptions(leagueId).queryKey })
      .catch(logRefreshFailure)
  }

  return useMutation({
    mutationFn: (cardId: string) => withdrawCard(leagueId, cardId),
    onSuccess: () => {
      refresh()
      void queryClient
        .invalidateQueries({ queryKey: walletQueryOptions(leagueId).queryKey })
        .catch(logRefreshFailure)
      void navigate({ to: '/l/$leagueId/collection', params: { leagueId } })
    },
    onError: (error) => {
      if (isCardGone(error)) {
        refresh()
        if (leaveOnGone) {
          void navigate({
            to: '/l/$leagueId/collection',
            params: { leagueId },
            search: { notice: 'withdrawn' },
          })
        }
      }
      logger.warn('Card withdrawal failed', {
        code: error instanceof ApiError ? error.code : undefined,
        status: error instanceof ApiError ? error.status : undefined,
      })
    },
  })
}
