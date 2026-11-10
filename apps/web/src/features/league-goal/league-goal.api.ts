import {
  goalContributorsSchema,
  leagueGoalSchema,
  type GoalContributors,
  type LeagueGoal,
} from '@storix/shared'
import { apiRequest, apiRequestVoid } from '@/lib/http'

function goalPath(leagueId: string): string {
  return `/api/leagues/${encodeURIComponent(leagueId)}/goal`
}

/** Fetches this week's league goal with its live progress and the viewer's share. */
export function fetchLeagueGoal(leagueId: string): Promise<LeagueGoal> {
  return apiRequest(goalPath(leagueId), { schema: leagueGoalSchema })
}

/** Lists every member who contributed to this week's goal, sorted by name. */
export function fetchGoalContributors(leagueId: string): Promise<GoalContributors> {
  return apiRequest(`${goalPath(leagueId)}/contributors`, { schema: goalContributorsSchema })
}

/** Records that the viewer has seen this week's "goal reached" banner. */
export function markGoalBannerSeen(leagueId: string): Promise<void> {
  return apiRequestVoid(`${goalPath(leagueId)}/banner-seen`, { method: 'POST' })
}
