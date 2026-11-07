import {
  cardDetailSchema,
  collectionPageSchema,
  type CardDetail,
  type CardTier,
  type CollectionPage,
} from '@storix/shared'
import { apiRequest } from '@/lib/http'

function cardsPath(leagueId: string): string {
  return `/api/leagues/${encodeURIComponent(leagueId)}/cards`
}

/** Fetches one page of a league's collection, ownership-aware, newest first. */
export function fetchCardPage(
  leagueId: string,
  params: { authorId: string | null; tier: CardTier | null; cursor: number | undefined },
): Promise<CollectionPage> {
  const query = new URLSearchParams()
  if (params.authorId) query.set('authorId', params.authorId)
  if (params.tier) query.set('tier', params.tier)
  if (params.cursor !== undefined) query.set('cursor', String(params.cursor))
  const suffix = query.size > 0 ? `?${query.toString()}` : ''
  return apiRequest(`${cardsPath(leagueId)}${suffix}`, { schema: collectionPageSchema })
}

/** Fetches the full detail of one card. */
export function fetchCardDetail(leagueId: string, cardId: string): Promise<CardDetail> {
  return apiRequest(`${cardsPath(leagueId)}/${encodeURIComponent(cardId)}`, {
    schema: cardDetailSchema,
  })
}
