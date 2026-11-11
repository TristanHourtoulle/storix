import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { EquipCosmeticBody, MyCosmeticsResponse } from '@storix/shared'
import { userMessage } from '@/features/errors/user-message'
import { logger } from '@/lib/logger'
import { equipCosmetic } from './cosmetics.api'
import { myCosmeticsQueryKey } from './cosmetics.queries'

interface EquipCosmetic {
  equip: (body: EquipCosmeticBody, onDone?: () => void) => void
  isPending: boolean
  errorMessage: string | null
  reset: () => void
}

/** Wears an owned item, or the original style, and updates the worn cosmetics everywhere. */
export function useEquipCosmetic(): EquipCosmetic {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: equipCosmetic,
    onSuccess: (equipped) => {
      queryClient.setQueryData<MyCosmeticsResponse>(myCosmeticsQueryKey, (mine) =>
        mine ? { ...mine, equipped } : mine,
      )
    },
    onError: (error: Error) => {
      logger.warn('Cosmetic equip failed', { message: error.message })
      void queryClient
        .invalidateQueries({ queryKey: myCosmeticsQueryKey })
        .catch((refreshError: unknown) =>
          logger.warn('Cosmetics refresh failed', { error: refreshError }),
        )
    },
  })

  return {
    equip: (body, onDone) => mutation.mutate(body, { onSuccess: () => onDone?.() }),
    isPending: mutation.isPending,
    errorMessage: mutation.error ? userMessage(mutation.error) : null,
    reset: mutation.reset,
  }
}
