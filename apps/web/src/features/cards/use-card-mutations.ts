import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query'
import type { CopyVariant, DustBalance, WalletState } from '@storix/shared'
import { ApiError } from '@/lib/http'
import { logger } from '@/lib/logger'
import { walletQueryOptions } from '@/features/game/game.queries'
import { craftCard, recycleCopy, upgradeToFoil } from './cards.api'

interface CardMutations {
  recycle: UseMutationResult<DustBalance, Error, CopyVariant>
  craft: UseMutationResult<DustBalance, Error, void>
  upgradeToFoil: UseMutationResult<DustBalance, Error, void>
}

/** Dust-spending actions on one card; each refreshes the wallet and the card caches. */
export function useCardMutations(leagueId: string, cardId: string): CardMutations {
  const queryClient = useQueryClient()
  const walletKey = walletQueryOptions(leagueId).queryKey

  function logRefreshFailure(error: unknown): void {
    logger.warn('Card cache refresh failed', { error })
  }

  function logFailure(action: string, error: Error): void {
    logger.warn('Card action failed', {
      action,
      code: error instanceof ApiError ? error.code : undefined,
      status: error instanceof ApiError ? error.status : undefined,
    })
  }

  function onSuccess({ dust }: DustBalance): void {
    queryClient.setQueryData<WalletState>(walletKey, (wallet) =>
      wallet ? { ...wallet, dust } : wallet,
    )
    void queryClient
      .invalidateQueries({ queryKey: ['leagues', leagueId, 'cards'] })
      .catch(logRefreshFailure)
    void queryClient.invalidateQueries({ queryKey: walletKey }).catch(logRefreshFailure)
  }

  const recycle = useMutation({
    mutationFn: (variant: CopyVariant) => recycleCopy(leagueId, cardId, variant),
    onSuccess,
    onError: (error) => logFailure('recycle', error),
  })
  const craft = useMutation({
    mutationFn: () => craftCard(leagueId, cardId),
    onSuccess,
    onError: (error) => logFailure('craft', error),
  })
  const upgrade = useMutation({
    mutationFn: () => upgradeToFoil(leagueId, cardId),
    onSuccess,
    onError: (error) => logFailure('foil', error),
  })

  return { recycle, craft, upgradeToFoil: upgrade }
}
