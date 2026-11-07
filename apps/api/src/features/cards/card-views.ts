import {
  canReact,
  canWithdrawCard,
  craftDecision,
  dustValue,
  foilUpgradeDecision,
  isBoosterEligible,
  maxTier,
  type CardAuthor,
  type CardPerson,
  type CardTier,
  type CollectionCard,
  type CopyVariant,
  type HiddenCardDetail,
  type HiddenCardSummary,
  type LockedCardSummary,
  type MediaVariantSize,
  type OwnedCardSummary,
  type ReactionCounts,
  type ViewerCardDetail,
} from '@storix/shared'
import type { MediaSigner } from '../../lib/media-signer'
import type { CardViewerRow, CollectionRow } from './cards.repository'
import { toImageSet } from './image-set'

const SUMMARY_SIZES: readonly MediaVariantSize[] = [256, 768]
const DETAIL_SIZES: readonly MediaVariantSize[] = [256, 768, 1600]

export interface CardDetailContext {
  viewerId: string
  signer: MediaSigner
  now: Date
  dust: number
  reactions: ReactionCounts
  copiesInLeague: number
  delayMinutes: number
}

export type CollectionCardBase = Omit<CollectionRow, 'normalTier' | 'foilTier'>

/** Returns true when the viewer owns any copy of the card. */
export function isOwned(row: CollectionRow): boolean {
  return row.normalTier !== null || row.foilTier !== null
}

/** Returns true when the viewer may see the card at all: active, or hidden with a copy of it. */
export function isVisibleTo(row: CollectionRow): boolean {
  return row.status === 'active' || isOwned(row)
}

/** Returns the tier shown to the viewer: the best owned copy's tier at mint, else the current tier. */
export function displayTier(row: CollectionRow): CardTier {
  if (row.normalTier !== null && row.foilTier !== null) return maxTier(row.normalTier, row.foilTier)
  return row.normalTier ?? row.foilTier ?? row.tier
}

/** Attaches the viewer's copies of a card, keyed by (card, owner, variant), to its base row. */
export function withViewerCopies(
  card: CollectionCardBase,
  copies: readonly { cardId: string; variant: CopyVariant; tierAtMint: CardTier }[],
): CollectionRow {
  const tierOf = (variant: CopyVariant) =>
    copies.find((copy) => copy.cardId === card.id && copy.variant === variant)?.tierAtMint ?? null
  return { ...card, normalTier: tierOf('normal'), foilTier: tierOf('foil') }
}

/** Projects a card's author columns to the author view shared by every card payload. */
export function toCardAuthor(row: {
  authorId: string | null
  authorName: string | null
  authorIsFormerMember: boolean
}): CardAuthor {
  return {
    userId: row.authorId,
    displayUsername: row.authorName,
    isFormerMember: row.authorIsFormerMember,
  }
}

function toOwnedSummary(
  row: CollectionRow,
  sizes: readonly MediaVariantSize[],
  signer: MediaSigner,
): OwnedCardSummary {
  return {
    kind: 'owned',
    id: row.id,
    number: row.number,
    title: row.title,
    tier: row.tier,
    displayTier: displayTier(row),
    isProvisional: row.isProvisional,
    author: toCardAuthor(row),
    thumbhash: row.thumbhash,
    dominantColor: row.dominantColor,
    width: row.width,
    height: row.height,
    image: toImageSet(row.variants, sizes, signer),
    copies: { normal: row.normalTier, foil: row.foilTier },
  }
}

function toLockedSummary(row: CollectionRow): LockedCardSummary {
  return {
    kind: 'locked',
    id: row.id,
    number: row.number,
    tier: row.tier,
    isProvisional: row.isProvisional,
    author: toCardAuthor(row),
    thumbhash: row.thumbhash,
    dominantColor: row.dominantColor,
    width: row.width,
    height: row.height,
  }
}

function toHiddenSummary(row: CollectionRow): HiddenCardSummary {
  return {
    kind: 'hidden',
    id: row.id,
    number: row.number,
    tier: displayTier(row),
    thumbhash: row.thumbhash,
    dominantColor: row.dominantColor,
    width: row.width,
    height: row.height,
    copies: { normal: row.normalTier, foil: row.foilTier },
  }
}

function toDiscoveredBy(row: CardViewerRow): CardPerson | null {
  if (row.discoveredAt === null) return null
  if (row.discoveredById === null) return { userId: null, displayUsername: null }
  return { userId: row.discoveredById, displayUsername: row.discovererName }
}

function ownedCopies(row: CollectionRow): { variant: CopyVariant; dust: number }[] {
  const entries: [CopyVariant, CollectionRow['normalTier']][] = [
    ['normal', row.normalTier],
    ['foil', row.foilTier],
  ]
  return entries.flatMap(([variant, tierAtMint]) =>
    tierAtMint === null ? [] : [{ variant, dust: dustValue(tierAtMint, variant) }],
  )
}

/** Decides whether the viewer may craft the card, shared by the card detail and the craft action. */
export function craftDecisionFor(
  row: CollectionRow & { createdAt: Date },
  input: { now: Date; dust: number; delayMinutes: number },
): ReturnType<typeof craftDecision> {
  return craftDecision({
    currentTier: row.tier,
    ownsAnyCopy: isOwned(row),
    isBoosterEligible: isBoosterEligible(row.createdAt, input.now, input.delayMinutes),
    dust: input.dust,
  })
}

/** Decides whether the viewer may upgrade their normal copy to foil, shared by the detail and the action. */
export function foilUpgradeDecisionFor(
  row: CollectionRow,
  dust: number,
): ReturnType<typeof foilUpgradeDecision> {
  return foilUpgradeDecision({
    currentTier: row.tier,
    normalTierAtMint: row.normalTier,
    ownsFoil: row.foilTier !== null,
    dust,
  })
}

/** Returns true when the viewer may react to the card, shared by the detail and the reaction action. */
export function canReactTo(row: CollectionRow, viewerId: string): boolean {
  return canReact({ isAuthor: row.authorId === viewerId, ownsCopy: isOwned(row) })
}

/**
 * Projects a collection row to what the viewer may see: a hidden face without title or image for a
 * hidden card, the full card if owned, a silhouette otherwise.
 */
export function toCollectionCard(row: CollectionRow, signer: MediaSigner): CollectionCard {
  if (row.status === 'hidden') return toHiddenSummary(row)
  return isOwned(row) ? toOwnedSummary(row, SUMMARY_SIZES, signer) : toLockedSummary(row)
}

function toHiddenDetail(row: CardViewerRow, canWithdraw: boolean): HiddenCardDetail {
  return { ...toHiddenSummary(row), createdAt: row.createdAt.toISOString(), canWithdraw }
}

/** Projects a card detail to what the viewer may see, with the actions the server allows. */
export function toCardDetail(row: CardViewerRow, ctx: CardDetailContext): ViewerCardDetail {
  const isAuthor = row.authorId === ctx.viewerId
  const canWithdraw = canWithdrawCard({
    isTagged: row.tagged.some((person) => person.userId === ctx.viewerId),
    isAuthor,
  })
  if (row.status === 'hidden') return toHiddenDetail(row, canWithdraw)
  const discoveredBy = toDiscoveredBy(row)
  const createdAt = row.createdAt.toISOString()
  if (!isOwned(row)) {
    return {
      ...toLockedSummary(row),
      createdAt,
      discoveredBy,
      canWithdraw,
      craft: craftDecisionFor(row, {
        now: ctx.now,
        dust: ctx.dust,
        delayMinutes: ctx.delayMinutes,
      }),
    }
  }
  return {
    ...toOwnedSummary(row, DETAIL_SIZES, ctx.signer),
    capturedAt: row.capturedAt?.toISOString() ?? null,
    isCaptureDateValidated: row.isCaptureDateValidated,
    createdAt,
    tagged: row.tagged.map((person) => ({
      userId: person.userId,
      displayUsername: person.displayUsername,
    })),
    discoveredBy,
    copiesInLeague: ctx.copiesInLeague,
    reactions: ctx.reactions,
    canReact: canReactTo(row, ctx.viewerId),
    canWithdraw,
    actions: {
      recycle: ownedCopies(row),
      foilUpgrade: foilUpgradeDecisionFor(row, ctx.dust),
    },
  }
}
