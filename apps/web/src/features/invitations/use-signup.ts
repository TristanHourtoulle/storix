import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import type { SignupBody } from '@storix/shared'
import { authClient } from '@/lib/auth-client'
import { authErrorMessage } from '@/features/auth/auth-errors'
import { meQueryOptions } from '@/features/auth/session.queries'
import { ApiError } from '@/lib/http'
import { UserFacingError, userMessage } from '@/features/errors/user-message'
import { invitationPreviewQueryOptions } from './invitations.queries'
import { signupWithInvitation } from './invitations.api'

/** Creates the account, signs in, then opens the joined league. */
export function useSignup(token: string): {
  signup: (body: SignupBody) => Promise<void>
  isPending: boolean
  errorMessage: string | null
} {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const mutation = useMutation({
    mutationFn: async (body: SignupBody): Promise<void> => {
      const { leagueId } = await signupWithInvitation(token, body)
      const { error } = await authClient.signIn.username(body)
      if (error) {
        throw new UserFacingError(
          authErrorMessage(error, 'Compte créé, mais connexion impossible. Connecte-toi.'),
        )
      }
      queryClient.removeQueries({ queryKey: meQueryOptions.queryKey })
      await navigate({ to: '/l/$leagueId', params: { leagueId }, replace: true })
    },
    onError: async (error) => {
      if (error instanceof ApiError && error.code === 'INVITATION_INVALID') {
        await queryClient.invalidateQueries({
          queryKey: invitationPreviewQueryOptions(token).queryKey,
        })
      }
    },
  })

  return {
    signup: (body) => mutation.mutateAsync(body).catch(() => undefined),
    isPending: mutation.isPending,
    errorMessage: mutation.error ? userMessage(mutation.error) : null,
  }
}
