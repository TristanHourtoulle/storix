import { useMutation, useQueryClient } from '@tanstack/react-query'
import { userMessage } from '@/features/errors/user-message'
import { revokeInvitation } from './invitations.api'
import { invitationsQueryOptions } from './invitations.queries'

/** Revokes an invitation and refreshes the list. */
export function useRevokeInvitation(leagueId: string): {
  revoke: (invitationId: string, onDone: () => void) => void
  reset: () => void
  isPending: boolean
  errorMessage: string | null
} {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    meta: { sound: 'error-only' },
    mutationFn: (invitationId: string) => revokeInvitation(leagueId, invitationId),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: invitationsQueryOptions(leagueId).queryKey }),
  })

  return {
    revoke: (invitationId, onDone) => mutation.mutate(invitationId, { onSuccess: onDone }),
    reset: mutation.reset,
    isPending: mutation.isPending,
    errorMessage: mutation.error ? userMessage(mutation.error) : null,
  }
}
