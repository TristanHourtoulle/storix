import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { EquipCosmeticBody, MyCosmeticsResponse } from '@storix/shared'
import { userMessage } from '@/features/errors/user-message'
import { logger } from '@/lib/logger'
import { equipCosmetic } from './cosmetics.api'
import { myCosmeticsQueryKey } from './cosmetics.queries'

const WORN_STYLE_SEGMENTS: ReadonlySet<unknown> = new Set([
  'cards',
  'members',
  'booster-history',
  'feed',
  'goal',
  'standings',
])

/** League queries whose payload carries what members wear (Moment stamp, name, banner, frame). */
function carriesWornStyle(queryKey: readonly unknown[]): boolean {
  return queryKey[0] === 'leagues' && WORN_STYLE_SEGMENTS.has(queryKey[2])
}

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
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ['me'] }),
        queryClient.invalidateQueries({ predicate: (query) => carriesWornStyle(query.queryKey) }),
      ]).catch((refreshError: unknown) =>
        logger.warn('Worn style refresh failed', { error: refreshError }),
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
