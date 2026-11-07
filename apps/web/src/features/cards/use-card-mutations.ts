import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query'
import type { CopyVariant, DustBalance, WalletState } from '@storix/shared'
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

  async function onSuccess({ dust }: DustBalance): Promise<void> {
    queryClient.setQueryData<WalletState>(walletKey, (wallet) =>
      wallet ? { ...wallet, dust } : wallet,
    )
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['leagues', leagueId, 'cards'] }),
      queryClient.invalidateQueries({ queryKey: walletKey }),
    ])
  }

  const recycle = useMutation({
    mutationFn: (variant: CopyVariant) => recycleCopy(leagueId, cardId, variant),
    onSuccess,
  })
  const craft = useMutation({ mutationFn: () => craftCard(leagueId, cardId), onSuccess })
  const upgrade = useMutation({ mutationFn: () => upgradeToFoil(leagueId, cardId), onSuccess })

  return { recycle, craft, upgradeToFoil: upgrade }
}
