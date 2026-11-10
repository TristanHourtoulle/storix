import {
  collectionPageSchema,
  dustBalanceSchema,
  reactionCountsSchema,
  stackActionResultSchema,
  viewerCardDetailSchema,
  type CardTier,
  type CollectionPage,
  type CollectionSort,
  type ConvertStackBody,
  type CopyVariant,
  type DustBalance,
  type ReactionCounts,
  type ReactionType,
  type StackActionResult,
  type ViewerCardDetail,
} from '@storix/shared'
import { apiRequest } from '@/lib/http'

function cardsPath(leagueId: string): string {
  return `/api/leagues/${encodeURIComponent(leagueId)}/cards`
}

function cardPath(leagueId: string, cardId: string): string {
  return `${cardsPath(leagueId)}/${encodeURIComponent(cardId)}`
}

/**
 * Fetches one page of a league's collection, ownership-aware, in the given sort: rarest first,
 * latest discoveries first (cards to discover last), or newest number first. The sort is always sent,
 * and the cursor must come from a page of the same sort.
 */
export function fetchCardPage(
  leagueId: string,
  params: {
    authorId: string | null
    tier: CardTier | null
    upgradable?: boolean
    sort: CollectionSort
    cursor: string | undefined
    limit?: number
  },
): Promise<CollectionPage> {
  const query = new URLSearchParams({ sort: params.sort })
  if (params.authorId) query.set('authorId', params.authorId)
  if (params.tier) query.set('tier', params.tier)
  if (params.upgradable) query.set('upgradable', 'true')
  if (params.cursor !== undefined) query.set('cursor', params.cursor)
  if (params.limit !== undefined) query.set('limit', String(params.limit))
  return apiRequest(`${cardsPath(leagueId)}?${query.toString()}`, { schema: collectionPageSchema })
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

/** Raises the personal tier of the viewer's copy by one step, from the tier the viewer saw. */
export function promoteCard(
  leagueId: string,
  cardId: string,
  from: CardTier,
): Promise<StackActionResult> {
  return apiRequest(`${cardPath(leagueId, cardId)}/promote`, {
    method: 'POST',
    body: { from },
    schema: stackActionResultSchema,
  })
}

/** Converts stacked duplicates of one variant into dust. */
export function convertStack(
  leagueId: string,
  cardId: string,
  body: ConvertStackBody,
): Promise<StackActionResult> {
  return apiRequest(`${cardPath(leagueId, cardId)}/stack/convert`, {
    method: 'POST',
    body,
    schema: stackActionResultSchema,
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
