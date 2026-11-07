import { cardDetailSchema, cardPageSchema, type CardDetail, type CardPage } from '@storix/shared'
import { apiRequest } from '@/lib/http'

function cardsPath(leagueId: string): string {
  return `/api/leagues/${encodeURIComponent(leagueId)}/cards`
}

/** Fetches one page of a league's cards, newest first. */
export function fetchCardPage(
  leagueId: string,
  params: { authorId: string | null; cursor: number | undefined },
): Promise<CardPage> {
  const query = new URLSearchParams()
  if (params.authorId) query.set('authorId', params.authorId)
  if (params.cursor !== undefined) query.set('cursor', String(params.cursor))
  const suffix = query.size > 0 ? `?${query.toString()}` : ''
  return apiRequest(`${cardsPath(leagueId)}${suffix}`, { schema: cardPageSchema })
}

/** Fetches the full detail of one card. */
export function fetchCardDetail(leagueId: string, cardId: string): Promise<CardDetail> {
  return apiRequest(`${cardsPath(leagueId)}/${encodeURIComponent(cardId)}`, {
    schema: cardDetailSchema,
  })
}
