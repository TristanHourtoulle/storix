import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import type { SignupBody } from '@storix/shared'
import { authClient } from '@/lib/auth-client'
import { purgeAllCaches } from '@/features/privacy/purge-cache'
import { ApiError } from '@/lib/http'
import { UserFacingError, userMessage } from '@/features/errors/user-message'
import { invitationPreviewQueryOptions } from './invitations.queries'
import { signupWithInvitation } from './invitations.api'

const SIGNIN_FAILED_MESSAGE = 'Compte créé, mais connexion impossible. Connecte-toi.'

/** Creates the account, signs in, then opens the joined league. */
export function useSignup(token: string): {
  signup: (body: SignupBody) => Promise<void>
  isPending: boolean
  errorMessage: string | null
} {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const mutation = useMutation({
    mutationFn: async (body: SignupBody): Promise<string> => {
      const { leagueId } = await signupWithInvitation(token, body)
      const { error } = await authClient.signIn.username(body)
      if (error) {
        await navigate({
          to: '/login',
          search: { redirect: `/join/${token}`, signup: 'failed' },
          replace: true,
        })
        throw new UserFacingError(SIGNIN_FAILED_MESSAGE)
      }
      return leagueId
    },
    onSuccess: async (leagueId) => {
      queryClient.clear()
      await purgeAllCaches()
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
    signup: async (body) => {
      await mutation.mutateAsync(body).catch(() => undefined)
    },
    isPending: mutation.isPending,
    errorMessage: mutation.error ? userMessage(mutation.error) : null,
  }
}
