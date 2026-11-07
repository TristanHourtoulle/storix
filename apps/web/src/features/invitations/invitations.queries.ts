import { queryOptions } from '@tanstack/react-query'
import { ApiError } from '@/lib/http'
import { fetchInvitationPreview } from './invitations.api'

export function invitationPreviewQueryOptions(token: string) {
  return queryOptions({
    queryKey: ['invitations', token, 'preview'],
    queryFn: () => fetchInvitationPreview(token),
    retry: false,
  })
}

/** True when the API rejected the invitation (unknown, malformed or no longer valid). */
export function isInvitationRejected(error: unknown): boolean {
  return error instanceof ApiError && error.status < 500
}
