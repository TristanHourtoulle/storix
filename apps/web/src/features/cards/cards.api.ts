import {
  cardReactorsSchema,
  collectionPageSchema,
  dustBalanceSchema,
  rarityHistorySchema,
  reactionCountsSchema,
  stackActionResultSchema,
  viewerCardDetailSchema,
  type CardReactors,
  type CardTier,
  type CollectionPage,
  type CollectionSort,
  type ConvertStackBody,
  type CopyVariant,
  type DustBalance,
  type RarityHistory,
  type ReactionCounts,
  type ReactionType,
  type StackActionResult,
  type ViewerCardDetail,
} from '@storix/shared'
import { apiRequest, apiRequestVoid } from '@/lib/http'

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
    moment?: boolean
    taggedUserId?: string | null
    seriesId?: string | null
    revealOwn?: boolean
    sort: CollectionSort
    cursor: string | undefined
    limit?: number
  },
): Promise<CollectionPage> {
  const query = new URLSearchParams({ sort: params.sort })
  if (params.authorId) query.set('authorId', params.authorId)
  if (params.tier) query.set('tier', params.tier)
  if (params.upgradable) query.set('upgradable', 'true')
  if (params.moment) query.set('moment', 'true')
  if (params.taggedUserId) query.set('taggedUserId', params.taggedUserId)
  if (params.seriesId) query.set('seriesId', params.seriesId)
  if (params.revealOwn) query.set('revealOwn', 'true')
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

/** Fetches the rarity journey of a card the viewer owns, newest step first. */
export function fetchRarityHistory(leagueId: string, cardId: string): Promise<RarityHistory> {
  return apiRequest(`${cardPath(leagueId, cardId)}/rarity-history`, {
    schema: rarityHistorySchema,
  })
}

/** Fetches who reacted to a card the viewer owns, one row per person, newest first. */
export function fetchCardReactors(leagueId: string, cardId: string): Promise<CardReactors> {
  return apiRequest(`${cardPath(leagueId, cardId)}/reactions`, { schema: cardReactorsSchema })
}

/** Tags the viewer on a card they own ("Je suis sur la photo"). */
export function tagSelf(leagueId: string, cardId: string): Promise<void> {
  return apiRequestVoid(`${cardPath(leagueId, cardId)}/tags/me`, { method: 'POST' })
}

/** Removes a member's tag from a card; allowed for that member, the author or an admin. */
export function removeCardTag(leagueId: string, cardId: string, userId: string): Promise<void> {
  return apiRequestVoid(`${cardPath(leagueId, cardId)}/tags/${encodeURIComponent(userId)}`, {
    method: 'DELETE',
  })
}
