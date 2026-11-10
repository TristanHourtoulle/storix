import {
  memberEmblemsSchema,
  unseenEmblemsSchema,
  type EmblemId,
  type MemberEmblems,
  type UnseenEmblems,
} from '@storix/shared'
import { apiRequest, apiRequestVoid } from '@/lib/http'

function leaguePath(leagueId: string): string {
  return `/api/leagues/${encodeURIComponent(leagueId)}`
}

/** Fetches every emblem of the catalogue with a member's progress and earned dates. */
export function fetchMemberEmblems(leagueId: string, userId: string): Promise<MemberEmblems> {
  return apiRequest(`${leaguePath(leagueId)}/members/${encodeURIComponent(userId)}/emblems`, {
    schema: memberEmblemsSchema,
  })
}

/** Fetches the viewer's earned emblems not yet announced. */
export function fetchUnseenEmblems(leagueId: string): Promise<UnseenEmblems> {
  return apiRequest(`${leaguePath(leagueId)}/emblems/unseen`, { schema: unseenEmblemsSchema })
}

/** Marks the given emblems as announced. */
export function markEmblemsSeen(leagueId: string, emblemIds: readonly EmblemId[]): Promise<void> {
  return apiRequestVoid(`${leaguePath(leagueId)}/emblems/seen`, {
    method: 'POST',
    body: { emblemIds },
  })
}

/** Sets the up to three emblems the viewer shows in their page header. */
export function setFeaturedEmblems(
  leagueId: string,
  emblemIds: readonly EmblemId[],
): Promise<MemberEmblems> {
  return apiRequest(`${leaguePath(leagueId)}/emblems/featured`, {
    method: 'PUT',
    body: { emblemIds },
    schema: memberEmblemsSchema,
  })
}
