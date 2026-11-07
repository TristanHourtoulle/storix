import {
  memberSummarySchema,
  type MemberSummary,
  type PhotosChoice,
  type UpdateMemberRoleBody,
} from '@storix/shared'
import { z } from 'zod'
import { apiRequest, apiRequestVoid } from '@/lib/http'

function leaguePath(leagueId: string): string {
  return `/api/leagues/${encodeURIComponent(leagueId)}`
}

function memberPath(leagueId: string, userId?: string): string {
  const base = `${leaguePath(leagueId)}/members`
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

/** Removes a member from a league, keeping or deleting the photos they authored. */
export function removeMember(
  leagueId: string,
  userId: string,
  photos: PhotosChoice,
): Promise<void> {
  return apiRequestVoid(memberPath(leagueId, userId), { method: 'DELETE', body: { photos } })
}

/** Leaves a league, keeping or deleting the photos the user authored there. */
export function leaveLeague(leagueId: string, photos: PhotosChoice): Promise<void> {
  return apiRequestVoid(`${leaguePath(leagueId)}/membership`, {
    method: 'DELETE',
    body: { photos },
  })
}

/** Transfers the league ownership to another member. */
export function transferOwnership(leagueId: string, userId: string): Promise<void> {
  return apiRequestVoid(`${leaguePath(leagueId)}/ownership`, {
    method: 'POST',
    body: { userId },
  })
}
