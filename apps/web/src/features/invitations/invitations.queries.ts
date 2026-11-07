import { queryOptions } from '@tanstack/react-query'
import { ApiError } from '@/lib/http'
import { fetchInvitationPreview, fetchInvitations } from './invitations.api'

export const INVITATIONS_QUERY_KEY = ['invitations'] as const

export function invitationPreviewQueryOptions(token: string) {
  return queryOptions({
    queryKey: [...INVITATIONS_QUERY_KEY, token, 'preview'],
    queryFn: () => fetchInvitationPreview(token),
    retry: false,
  })
}

export function invitationsQueryOptions(leagueId: string) {
  return queryOptions({
    queryKey: ['leagues', leagueId, 'invitations'],
    queryFn: () => fetchInvitations(leagueId),
  })
}

/** True when the API rejected the invitation (unknown, malformed or no longer valid). */
export function isInvitationRejected(error: unknown): boolean {
  return error instanceof ApiError && error.status < 500
}
