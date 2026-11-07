import { leagueDetailSchema, type LeagueDetail } from '@storix/shared'
import { apiRequest } from '@/lib/http'

/** Fetches a league the current user belongs to. */
export function fetchLeagueDetail(leagueId: string): Promise<LeagueDetail> {
  return apiRequest(`/api/leagues/${encodeURIComponent(leagueId)}`, { schema: leagueDetailSchema })
}
