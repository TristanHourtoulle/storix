import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { MeResponse, UpdateDisplayNameBody } from '@storix/shared'
import { meQueryOptions } from '@/features/auth/session.queries'
import { userMessage } from '@/features/errors/user-message'
import { updateDisplayName } from './account.api'

/** Updates the display name, refreshes `me` and invalidates the league views (members, cards, reveals) that show names. */
export function useUpdateDisplayName(): {
  save: (body: UpdateDisplayNameBody) => void
  reset: () => void
  isPending: boolean
  isSuccess: boolean
  errorMessage: string | null
} {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: updateDisplayName,
    onSuccess: (me: MeResponse) => {
      queryClient.setQueryData(meQueryOptions.queryKey, me)
      void queryClient.invalidateQueries({ queryKey: ['leagues'] })
    },
  })

  return {
    save: mutation.mutate,
    reset: mutation.reset,
    isPending: mutation.isPending,
    isSuccess: mutation.isSuccess,
    errorMessage: mutation.error ? userMessage(mutation.error) : null,
  }
}
