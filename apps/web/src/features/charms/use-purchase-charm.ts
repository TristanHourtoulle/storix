import { useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  CharmShopResponse,
  PurchaseCharmBody,
  PurchaseCharmResponse,
  WalletState,
} from '@storix/shared'
import { userMessage } from '@/features/errors/user-message'
import { walletQueryOptions } from '@/features/game/game.queries'
import { playSound } from '@/features/sound/sound'
import { ApiError } from '@/lib/http'
import { logger } from '@/lib/logger'
import { purchaseCharm } from './charms.api'
import { charmShopQueryOptions } from './charms.queries'

interface PurchaseCharm {
  purchase: (body: PurchaseCharmBody, onDone: () => void) => void
  isPending: boolean
  errorMessage: string | null
}

/** Buys a charm, then updates the balance, the wallet's charm slot and the weekly count. */
export function usePurchaseCharm(leagueId: string): PurchaseCharm {
  const queryClient = useQueryClient()
  const walletKey = walletQueryOptions(leagueId).queryKey
  const shopKey = charmShopQueryOptions(leagueId).queryKey

  function refresh(): void {
    void Promise.all([
      queryClient.invalidateQueries({ queryKey: walletKey }),
      queryClient.invalidateQueries({ queryKey: shopKey }),
    ]).catch((error: unknown) => logger.warn('Charm cache refresh failed', { error }))
  }

  const mutation = useMutation({
    mutationFn: (body: PurchaseCharmBody) => purchaseCharm(leagueId, body),
    onSuccess: ({ dust, active, purchasesThisWeek }: PurchaseCharmResponse) => {
      queryClient.setQueryData<WalletState>(walletKey, (wallet) =>
        wallet ? { ...wallet, dust, charm: active } : wallet,
      )
      queryClient.setQueryData<CharmShopResponse>(shopKey, (shop) =>
        shop ? { ...shop, dust, active, purchasesThisWeek } : shop,
      )
      playSound({ name: 'confirm' })
      refresh()
    },
    onError: (error: Error) => {
      logger.warn('Charm purchase failed', {
        code: error instanceof ApiError ? error.code : undefined,
      })
      if (error instanceof ApiError && error.status === 409) refresh()
    },
  })

  return {
    purchase: (body, onDone) => mutation.mutate(body, { onSuccess: onDone }),
    isPending: mutation.isPending,
    errorMessage: mutation.error ? userMessage(mutation.error) : null,
  }
}
