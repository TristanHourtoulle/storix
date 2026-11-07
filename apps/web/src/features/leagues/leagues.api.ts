import {
  leagueDetailSchema,
  leagueSummarySchema,
  type CreateLeagueBody,
  type LeagueDetail,
  type LeagueSummary,
} from '@storix/shared'
import { apiRequest } from '@/lib/http'

/** Fetches a league the current user belongs to. */
export function fetchLeagueDetail(leagueId: string): Promise<LeagueDetail> {
  return apiRequest(`/api/leagues/${encodeURIComponent(leagueId)}`, { schema: leagueDetailSchema })
}

/** Creates a league owned by the current user. */
export function createLeague(body: CreateLeagueBody): Promise<LeagueSummary> {
  return apiRequest('/api/leagues', { method: 'POST', body, schema: leagueSummarySchema })
}
