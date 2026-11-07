import {
  leagueDetailSchema,
  leagueSummarySchema,
  type CreateLeagueBody,
  type LeagueDetail,
  type LeagueSummary,
  type RenameLeagueBody,
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

/** Renames a league; restricted to its admins and owner. */
export function renameLeague(leagueId: string, body: RenameLeagueBody): Promise<LeagueDetail> {
  return apiRequest(`/api/leagues/${encodeURIComponent(leagueId)}`, {
    method: 'PATCH',
    body,
    schema: leagueDetailSchema,
  })
}
