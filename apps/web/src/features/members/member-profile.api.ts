import { memberProfileSchema, type MemberProfile } from '@storix/shared'
import { apiRequest, apiRequestVoid } from '@/lib/http'

function leaguePath(leagueId: string): string {
  return `/api/leagues/${encodeURIComponent(leagueId)}`
}

/** Fetches a member's page: header, stats, showcase and tab counts. */
export function fetchMemberProfile(leagueId: string, userId: string): Promise<MemberProfile> {
  return apiRequest(`${leaguePath(leagueId)}/members/${encodeURIComponent(userId)}/profile`, {
    schema: memberProfileSchema,
  })
}

/** Saves the up to six cards the viewer shows off, in slot order. */
export function saveShowcase(leagueId: string, cardIds: readonly string[]): Promise<void> {
  return apiRequestVoid(`${leaguePath(leagueId)}/showcase`, { method: 'PUT', body: { cardIds } })
}

/** Resets the viewer's showcase to the automatic choice. */
export function resetShowcase(leagueId: string): Promise<void> {
  return apiRequestVoid(`${leaguePath(leagueId)}/showcase`, { method: 'DELETE' })
}
