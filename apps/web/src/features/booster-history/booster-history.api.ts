import { boosterHistoryPageSchema, type BoosterHistoryPage } from '@storix/shared'
import { apiRequest } from '@/lib/http'

/** Fetches one page of the viewer's booster openings in a league, newest first; stats come on the first page. */
export function fetchBoosterHistory(
  leagueId: string,
  cursor: string | undefined,
): Promise<BoosterHistoryPage> {
  const query = new URLSearchParams()
  if (cursor !== undefined) query.set('cursor', cursor)
  const search = query.size > 0 ? `?${query.toString()}` : ''
  return apiRequest(`/api/leagues/${encodeURIComponent(leagueId)}/boosters/history${search}`, {
    schema: boosterHistoryPageSchema,
  })
}
