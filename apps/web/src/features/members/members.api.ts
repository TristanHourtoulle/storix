import { memberSummarySchema, type MemberSummary, type UpdateMemberRoleBody } from '@storix/shared'
import { z } from 'zod'
import { apiRequest, apiRequestVoid } from '@/lib/http'

function memberPath(leagueId: string, userId?: string): string {
  const base = `/api/leagues/${encodeURIComponent(leagueId)}/members`
  return userId ? `${base}/${encodeURIComponent(userId)}` : base
}

/** Fetches the members of a league with per-member permission flags. */
export function fetchMembers(leagueId: string): Promise<MemberSummary[]> {
  return apiRequest(memberPath(leagueId), { schema: z.array(memberSummarySchema) })
}

/** Changes a member's role. */
export function updateMemberRole(
  leagueId: string,
  userId: string,
  body: UpdateMemberRoleBody,
): Promise<void> {
  return apiRequestVoid(memberPath(leagueId, userId), { method: 'PATCH', body })
}

/** Removes a member from a league. */
export function removeMember(leagueId: string, userId: string): Promise<void> {
  return apiRequestVoid(memberPath(leagueId, userId), { method: 'DELETE' })
}
