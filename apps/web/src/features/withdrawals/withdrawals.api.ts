import { taggedCardSchema, type TaggedCard } from '@storix/shared'
import { z } from 'zod'
import { apiRequest, apiRequestVoid } from '@/lib/http'

function leaguePath(leagueId: string): string {
  return `/api/leagues/${encodeURIComponent(leagueId)}`
}

/** Fetches the cards the caller is tagged on, hidden ones included. */
export function fetchTaggedCards(leagueId: string): Promise<TaggedCard[]> {
  return apiRequest(`${leaguePath(leagueId)}/me/tagged-cards`, {
    schema: z.array(taggedCardSchema),
  })
}

/** Withdraws a card from the league for everyone. */
export function withdrawCard(leagueId: string, cardId: string): Promise<void> {
  return apiRequestVoid(`${leaguePath(leagueId)}/cards/${encodeURIComponent(cardId)}/withdraw`, {
    method: 'POST',
  })
}
