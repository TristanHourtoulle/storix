import { useSuspenseQuery } from '@tanstack/react-query'
import type { InvitationSummary } from '@storix/shared'
import { invitationsQueryOptions } from './invitations.queries'

/** Active (still valid) invitations of a league. */
export function useActiveInvitations(leagueId: string): InvitationSummary[] {
  const { data } = useSuspenseQuery(invitationsQueryOptions(leagueId))
  return data.filter((invitation) => invitation.status === 'valid')
}
