import { removedCardsSchema, type RemovedCards } from '@storix/shared'
import { apiRequest } from '@/lib/http'

interface RemovedCardsCursor {
  since?: string
  after?: string
}

/** Fetches one page of cards removed from a league since the given cursor. */
export function fetchRemovedCards(
  leagueId: string,
  cursor: RemovedCardsCursor,
): Promise<RemovedCards> {
  const params = new URLSearchParams()
  if (cursor.since) params.set('since', cursor.since)
  if (cursor.after) params.set('after', cursor.after)
  const query = params.size > 0 ? `?${params.toString()}` : ''
  return apiRequest(`/api/leagues/${encodeURIComponent(leagueId)}/removed-cards${query}`, {
    schema: removedCardsSchema,
  })
}
