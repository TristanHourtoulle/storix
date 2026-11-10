import {
  missionClaimSchema,
  missionRerollSchema,
  missionsStateSchema,
  type MissionClaim,
  type MissionReroll,
  type MissionsState,
} from '@storix/shared'
import { apiRequest, apiRequestVoid } from '@/lib/http'

function leaguePath(leagueId: string): string {
  return `/api/leagues/${encodeURIComponent(leagueId)}`
}

function missionPath(leagueId: string, missionId: string): string {
  return `${leaguePath(leagueId)}/missions/${encodeURIComponent(missionId)}`
}

/** Fetches the viewer's daily and weekly missions with their live progress. */
export function fetchMissions(leagueId: string): Promise<MissionsState> {
  return apiRequest(`${leaguePath(leagueId)}/missions`, { schema: missionsStateSchema })
}

/** Claims the reward of a completed mission. */
export function claimMission(leagueId: string, missionId: string): Promise<MissionClaim> {
  return apiRequest(`${missionPath(leagueId, missionId)}/claim`, {
    method: 'POST',
    schema: missionClaimSchema,
  })
}

/** Replaces an unfinished daily mission with another one, once a day. */
export function rerollMission(leagueId: string, missionId: string): Promise<MissionReroll> {
  return apiRequest(`${missionPath(leagueId, missionId)}/reroll`, {
    method: 'POST',
    schema: missionRerollSchema,
  })
}

/** Records a visit to another member's page for the "visit a member page" mission. */
export function recordMemberVisit(leagueId: string, userId: string): Promise<void> {
  return apiRequestVoid(`${leaguePath(leagueId)}/members/${encodeURIComponent(userId)}/visit`, {
    method: 'POST',
  })
}
