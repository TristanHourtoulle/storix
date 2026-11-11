import { useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  CosmeticItemId,
  MyCosmeticsResponse,
  PurchaseCosmeticBody,
  PurchaseCosmeticResponse,
  WalletState,
} from '@storix/shared'
import { userMessage } from '@/features/errors/user-message'
import { walletQueryOptions } from '@/features/game/game.queries'
import { playSound } from '@/features/sound/sound'
import { ApiError } from '@/lib/http'
import { logger } from '@/lib/logger'
import { purchaseCosmetic } from './cosmetics.api'
import { myCosmeticsQueryKey } from './cosmetics.queries'

interface PurchaseCosmetic {
  purchase: (body: PurchaseCosmeticBody, onDone: (itemId: CosmeticItemId) => void) => void
  reset: () => void
  isPending: boolean
  errorMessage: string | null
}

/** Buys an item with the league's paillettes, then updates the balance and the owned cosmetics. */
export function usePurchaseCosmetic(leagueId: string): PurchaseCosmetic {
  const queryClient = useQueryClient()
  const walletKey = walletQueryOptions(leagueId).queryKey

  function refresh(): void {
    void Promise.all([
      queryClient.invalidateQueries({ queryKey: walletKey }),
      queryClient.invalidateQueries({ queryKey: myCosmeticsQueryKey }),
    ]).catch((error: unknown) => logger.warn('Shop cache refresh failed', { error }))
  }

  const mutation = useMutation({
    mutationFn: (body: PurchaseCosmeticBody) => purchaseCosmetic(leagueId, body),
    onSuccess: ({ dust, owned, equipped }: PurchaseCosmeticResponse) => {
      queryClient.setQueryData<WalletState>(walletKey, (wallet) =>
        wallet ? { ...wallet, dust } : wallet,
      )
      queryClient.setQueryData<MyCosmeticsResponse>(myCosmeticsQueryKey, { owned, equipped })
      playSound({ name: 'confirm' })
      refresh()
    },
    onError: (error: Error) => {
      logger.warn('Cosmetic purchase failed', {
        code: error instanceof ApiError ? error.code : undefined,
      })
      if (error instanceof ApiError && error.status === 409) refresh()
    },
  })

  return {
    purchase: (body, onDone) => mutation.mutate(body, { onSuccess: () => onDone(body.itemId) }),
    reset: mutation.reset,
    isPending: mutation.isPending,
    errorMessage: mutation.error ? userMessage(mutation.error) : null,
  }
}
