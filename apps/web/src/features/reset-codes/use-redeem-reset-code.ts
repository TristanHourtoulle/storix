import { useMutation } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import type { RedeemResetCodeBody } from '@storix/shared'
import { userMessage } from '@/features/errors/user-message'
import { redeemResetCode } from './reset-codes.api'

/** Redeems a reset code, then returns to the login screen. */
export function useRedeemResetCode(): {
  redeem: (body: RedeemResetCodeBody) => void
  isPending: boolean
  errorMessage: string | null
} {
  const navigate = useNavigate()
  const mutation = useMutation({
    mutationFn: redeemResetCode,
    onSuccess: async () => {
      await navigate({ to: '/login', search: { reset: 'done' }, replace: true })
    },
  })

  return {
    redeem: mutation.mutate,
    isPending: mutation.isPending,
    errorMessage: mutation.error ? userMessage(mutation.error) : null,
  }
}
