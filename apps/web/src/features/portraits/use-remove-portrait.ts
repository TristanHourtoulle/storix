import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Portrait } from '@storix/shared'
import { userMessage } from '@/features/errors/user-message'
import { onPortraitChanged } from './portrait-cache'
import type { PortraitTarget } from './portrait-target'
import { deletePortrait } from './portraits.api'

/** Removes the current portrait, then purges its cached images and refetches the views showing it. */
export function useRemovePortrait(
  target: PortraitTarget,
  current: Portrait | null,
): { remove: () => void; isPending: boolean; isSuccess: boolean; errorMessage: string | null } {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: async () => {
      await deletePortrait(target)
      await onPortraitChanged(queryClient, target, current)
    },
  })

  return {
    remove: mutation.mutate,
    isPending: mutation.isPending,
    isSuccess: mutation.isSuccess,
    errorMessage: mutation.error ? userMessage(mutation.error) : null,
  }
}
