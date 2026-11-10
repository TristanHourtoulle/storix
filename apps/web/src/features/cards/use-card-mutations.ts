import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query'
import type {
  CardTier,
  ConvertStackBody,
  CopyVariant,
  DustBalance,
  StackActionResult,
  WalletState,
} from '@storix/shared'
import { ApiError } from '@/lib/http'
import { logger } from '@/lib/logger'
import { walletQueryOptions } from '@/features/game/game.queries'
import { refreshFeed } from '@/features/league-feed/league-feed.queries'
import { convertStack, promoteCard, recycleCopy, upgradeToFoil } from './cards.api'
import { refreshEmblems } from '@/features/emblems/emblems.queries'
import { refreshMissions } from '@/features/missions/missions.queries'

interface CardMutations {
  recycle: UseMutationResult<DustBalance, Error, CopyVariant>
  upgradeToFoil: UseMutationResult<DustBalance, Error, void>
  promote: UseMutationResult<StackActionResult, Error, CardTier>
  convertStack: UseMutationResult<StackActionResult, Error, ConvertStackBody>
}

/** Dust-spending actions on one card; each refreshes the wallet and the card caches. */
export function useCardMutations(leagueId: string, cardId: string): CardMutations {
  const queryClient = useQueryClient()
  const walletKey = walletQueryOptions(leagueId).queryKey

  function logRefreshFailure(error: unknown): void {
    logger.warn('Card cache refresh failed', { error })
  }

  function refreshCards(): void {
    void queryClient
      .invalidateQueries({ queryKey: ['leagues', leagueId, 'cards'] })
      .catch(logRefreshFailure)
    refreshFeed(queryClient, leagueId)
  }

  function onFailure(action: string, error: Error): void {
    logger.warn('Card action failed', {
      action,
      code: error instanceof ApiError ? error.code : undefined,
      status: error instanceof ApiError ? error.status : undefined,
    })
    if (error instanceof ApiError && error.status === 409) {
      refreshCards()
      void queryClient.invalidateQueries({ queryKey: walletKey }).catch(logRefreshFailure)
    }
  }

  function onSuccess({ dust }: DustBalance): void {
    queryClient.setQueryData<WalletState>(walletKey, (wallet) =>
      wallet ? { ...wallet, dust } : wallet,
    )
    refreshCards()
    refreshEmblems(queryClient, leagueId)
    refreshMissions(queryClient, leagueId)
    void queryClient.invalidateQueries({ queryKey: walletKey }).catch(logRefreshFailure)
  }

  const recycle = useMutation({
    mutationFn: (variant: CopyVariant) => recycleCopy(leagueId, cardId, variant),
    onSuccess,
    onError: (error) => onFailure('recycle', error),
  })
  const upgrade = useMutation({
    mutationFn: () => upgradeToFoil(leagueId, cardId),
    onSuccess,
    onError: (error) => onFailure('foil', error),
  })
  const promote = useMutation({
    mutationFn: (from: CardTier) => promoteCard(leagueId, cardId, from),
    onSuccess,
    onError: (error) => onFailure('promote', error),
  })
  const convert = useMutation({
    mutationFn: (body: ConvertStackBody) => convertStack(leagueId, cardId, body),
    onSuccess,
    onError: (error) => onFailure('convert', error),
  })

  return { recycle, upgradeToFoil: upgrade, promote, convertStack: convert }
}
