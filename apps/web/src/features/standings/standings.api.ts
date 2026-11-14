import { leagueStandingsSchema, type LeagueStandings } from '@storix/shared'
import { apiRequest } from '@/lib/http'

/** Fetches every current member's ranking and trophy stats. */
export function fetchStandings(leagueId: string): Promise<LeagueStandings> {
  return apiRequest(`/api/leagues/${encodeURIComponent(leagueId)}/standings`, {
    schema: leagueStandingsSchema,
  })
}
