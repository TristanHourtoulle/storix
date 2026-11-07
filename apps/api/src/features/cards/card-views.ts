import {
  canReact,
  canWithdrawCard,
  craftDecision,
  DEFAULT_NEW_CARD_DELAY_MINUTES,
  dustValue,
  foilUpgradeDecision,
  isBoosterEligible,
  maxTier,
  type CardPerson,
  type CardTier,
  type CollectionCard,
  type CopyVariant,
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
}

export type CollectionCardBase = Omit<CollectionRow, 'normalTier' | 'foilTier'>

/** Returns true when the viewer owns any copy of the card. */
export function isOwned(row: CollectionRow): boolean {
  return row.normalTier !== null || row.foilTier !== null
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
    author: { userId: row.authorId, displayUsername: row.authorName },
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
    author: { userId: row.authorId, displayUsername: row.authorName },
    thumbhash: row.thumbhash,
    dominantColor: row.dominantColor,
    width: row.width,
    height: row.height,
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
  now: Date,
  dust: number,
): ReturnType<typeof craftDecision> {
  return craftDecision({
    currentTier: row.tier,
    ownsAnyCopy: isOwned(row),
    isBoosterEligible: isBoosterEligible(row.createdAt, now, DEFAULT_NEW_CARD_DELAY_MINUTES),
    dust,
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

/** Projects a collection row to what the viewer may see: the full card if owned, a silhouette otherwise. */
export function toCollectionCard(row: CollectionRow, signer: MediaSigner): CollectionCard {
  return isOwned(row) ? toOwnedSummary(row, SUMMARY_SIZES, signer) : toLockedSummary(row)
}

/** Projects a card detail to what the viewer may see, with the actions the server allows. */
export function toCardDetail(row: CardViewerRow, ctx: CardDetailContext): ViewerCardDetail {
  const isAuthor = row.authorId === ctx.viewerId
  const canWithdraw = canWithdrawCard({
    isTagged: row.tagged.some((person) => person.userId === ctx.viewerId),
    isAuthor,
  })
  const discoveredBy = toDiscoveredBy(row)
  const createdAt = row.createdAt.toISOString()
  if (!isOwned(row)) {
    return {
      ...toLockedSummary(row),
      createdAt,
      discoveredBy,
      canWithdraw,
      craft: craftDecisionFor(row, ctx.now, ctx.dust),
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
