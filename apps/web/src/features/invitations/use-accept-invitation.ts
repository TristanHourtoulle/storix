import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { meQueryOptions } from '@/features/auth/session.queries'
import { ApiError } from '@/lib/http'
import { userMessage } from '@/features/errors/user-message'
import { invitationPreviewQueryOptions } from './invitations.queries'
import { acceptInvitation } from './invitations.api'

/** Joins the league of an invitation and opens it. */
export function useAcceptInvitation(token: string): {
  accept: () => void
  isPending: boolean
  errorMessage: string | null
} {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const mutation = useMutation({
    mutationFn: () => acceptInvitation(token),
    onSuccess: async ({ leagueId }) => {
      await queryClient.invalidateQueries({ queryKey: meQueryOptions.queryKey })
      await navigate({ to: '/l/$leagueId', params: { leagueId } })
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
    accept: () => mutation.mutate(),
    isPending: mutation.isPending,
    errorMessage: mutation.error ? userMessage(mutation.error) : null,
  }
}
