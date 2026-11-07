import {
  createInvitationResponseSchema,
  invitationPreviewSchema,
  invitationSummarySchema,
  joinResponseSchema,
  type CreateInvitationBody,
  type CreateInvitationResponse,
  type InvitationPreview,
  type InvitationSummary,
  type JoinResponse,
  type SignupBody,
} from '@storix/shared'
import { z } from 'zod'
import { apiRequest, apiRequestVoid } from '@/lib/http'

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

function leagueInvitationsPath(leagueId: string, invitationId?: string): string {
  const base = `/api/leagues/${encodeURIComponent(leagueId)}/invitations`
  return invitationId ? `${base}/${encodeURIComponent(invitationId)}` : base
}

/** Lists the invitations of a league. */
export function fetchInvitations(leagueId: string): Promise<InvitationSummary[]> {
  return apiRequest(leagueInvitationsPath(leagueId), { schema: z.array(invitationSummarySchema) })
}

/** Creates an invitation; the returned URL is only available now. */
export function createInvitation(
  leagueId: string,
  body: CreateInvitationBody,
): Promise<CreateInvitationResponse> {
  return apiRequest(leagueInvitationsPath(leagueId), {
    method: 'POST',
    body,
    schema: createInvitationResponseSchema,
  })
}

/** Revokes an invitation. */
export function revokeInvitation(leagueId: string, invitationId: string): Promise<void> {
  return apiRequestVoid(leagueInvitationsPath(leagueId, invitationId), { method: 'DELETE' })
}
