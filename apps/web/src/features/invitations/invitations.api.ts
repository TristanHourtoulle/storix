import {
  invitationPreviewSchema,
  joinResponseSchema,
  type InvitationPreview,
  type JoinResponse,
  type SignupBody,
} from '@storix/shared'
import { apiRequest } from '@/lib/http'

function invitationPath(token: string, action?: string): string {
  const base = `/api/invitations/${encodeURIComponent(token)}`
  return action ? `${base}/${action}` : base
}

/** Fetches the public preview of an invitation. */
export function fetchInvitationPreview(token: string): Promise<InvitationPreview> {
  return apiRequest(invitationPath(token), { schema: invitationPreviewSchema })
}

/** Creates an account through an invitation; no session is started. */
export function signupWithInvitation(token: string, body: SignupBody): Promise<JoinResponse> {
  return apiRequest(invitationPath(token, 'signup'), {
    method: 'POST',
    body,
    schema: joinResponseSchema,
  })
}

/** Joins the invitation's league as the signed-in user. */
export function acceptInvitation(token: string): Promise<JoinResponse> {
  return apiRequest(invitationPath(token, 'accept'), {
    method: 'POST',
    schema: joinResponseSchema,
  })
}
