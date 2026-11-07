import {
  collectionPageSchema,
  dustBalanceSchema,
  reactionCountsSchema,
  viewerCardDetailSchema,
  type CardTier,
  type CollectionPage,
  type CopyVariant,
  type DustBalance,
  type ReactionCounts,
  type ReactionType,
  type ViewerCardDetail,
} from '@storix/shared'
import { apiRequest } from '@/lib/http'

function cardsPath(leagueId: string): string {
  return `/api/leagues/${encodeURIComponent(leagueId)}/cards`
}

function cardPath(leagueId: string, cardId: string): string {
  return `${cardsPath(leagueId)}/${encodeURIComponent(cardId)}`
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

/** Fetches the viewer-specific detail of one card. */
export function fetchCardDetail(leagueId: string, cardId: string): Promise<ViewerCardDetail> {
  return apiRequest(cardPath(leagueId, cardId), { schema: viewerCardDetailSchema })
}

/** Recycles one owned copy into dust. */
export function recycleCopy(
  leagueId: string,
  cardId: string,
  variant: CopyVariant,
): Promise<DustBalance> {
  return apiRequest(`${cardPath(leagueId, cardId)}/recycle`, {
    method: 'POST',
    body: { variant },
    schema: dustBalanceSchema,
  })
}

/** Upgrades the normal copy to foil with dust. */
export function upgradeToFoil(leagueId: string, cardId: string): Promise<DustBalance> {
  return apiRequest(`${cardPath(leagueId, cardId)}/foil`, {
    method: 'POST',
    schema: dustBalanceSchema,
  })
}

/** Adds (PUT) or removes (DELETE) the caller's reaction and returns the new counts. */
export function setReaction(
  leagueId: string,
  cardId: string,
  type: ReactionType,
  isOn: boolean,
): Promise<ReactionCounts> {
  return apiRequest(`${cardPath(leagueId, cardId)}/reactions/${type}`, {
    method: isOn ? 'PUT' : 'DELETE',
    schema: reactionCountsSchema,
  })
}
