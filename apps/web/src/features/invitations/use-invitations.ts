import { useQuery } from '@tanstack/react-query'
import type { InvitationSummary } from '@storix/shared'
import { invitationsQueryOptions } from './invitations.queries'

/** Active (still valid) invitations of a league with their loading state. */
export function useActiveInvitations(leagueId: string): {
  invitations: InvitationSummary[]
  isPending: boolean
  isError: boolean
} {
  const { data, isPending, isError } = useQuery(invitationsQueryOptions(leagueId))
  return {
    invitations: (data ?? []).filter((invitation) => invitation.status === 'valid'),
    isPending,
    isError,
  }
}
