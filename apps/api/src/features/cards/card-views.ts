import {
  canReact,
  canWithdrawCard,
  copyDustValue,
  copyValueTier,
  craftDecision,
  foilUpgradeDecision,
  isBoosterEligible,
  isPromoted,
  personalDisplayTier,
  promotionDecision,
  stackCountsByCard,
  tierRank,
  type CardAuthor,
  type CardPerson,
  type CardTier,
  type CollectionCard,
  type CollectionCursor,
  type CollectionSort,
  type CopyVariant,
  type HiddenCardDetail,
  type HiddenCardSummary,
  type LockedCardSummary,
  type MediaVariantSize,
  type OwnedCardDetail,
  type OwnedCardSummary,
  type OwnedCopyState,
  type PromotedHolder,
  type PromotionAction,
  type ReactionCounts,
  type StackEntry,
  type ViewerCardDetail,
} from '@storix/shared'
import type { MediaSigner } from '../../lib/media-signer'
import type { OwnedCopyRow } from '../copies/copies.repository'
import type { CardStackEntry, PromotedHolderRow } from '../copies/stacks.repository'
import type { CardViewerRow, CollectionRow } from './cards.repository'
import { toImageSet } from './image-set'

const MAX_PROMOTED_HOLDERS = 50

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
  stack: StackEntry[]
  promotedHolders: PromotedHolder[]
}

export type CollectionCardBase = Omit<
  CollectionRow,
  | 'normalTier'
  | 'foilTier'
  | 'normalPromotedTier'
  | 'foilPromotedTier'
  | 'stackCount'
  | 'firstCopyAt'
>

/** Returns true when the viewer owns any copy of the card, which gives it a first copy date. */
export function isOwned<T extends CollectionRow>(row: T): row is T & { firstCopyAt: Date } {
  return row.firstCopyAt !== null
}

/** Returns true when the viewer may see the card at all: active, or hidden with a copy of it. */
export function isVisibleTo(row: CollectionRow): boolean {
  return row.status === 'active' || isOwned(row)
}

/** Returns the viewer's copies of a card as domain copy states, normal first. */
export function rowCopies(row: CollectionRow): OwnedCopyState[] {
  const entries: [CopyVariant, CardTier | null, CardTier | null][] = [
    ['normal', row.normalTier, row.normalPromotedTier],
    ['foil', row.foilTier, row.foilPromotedTier],
  ]
  return entries.flatMap(([variant, tierAtMint, promotedTier]) =>
    tierAtMint === null ? [] : [{ variant, tierAtMint, promotedTier }],
  )
}

/** Returns the tier shown to the viewer: the best of their copies, a promoted one never below the league tier, else the league tier. */
export function displayTier(row: CollectionRow): CardTier {
  return personalDisplayTier(rowCopies(row), row.tier)
}

/** Attaches the viewer's copies and stacked copies of a card, keyed by (card, owner, variant), to its base row. */
export function withViewerCopies(
  card: CollectionCardBase,
  copies: readonly OwnedCopyRow[],
  stacks: readonly CardStackEntry[] = [],
): CollectionRow {
  const copyOf = (variant: CopyVariant) =>
    copies.find((copy) => copy.cardId === card.id && copy.variant === variant)
  const normal = copyOf('normal')
  const foil = copyOf('foil')
  const firstCopyAt = copies
    .filter((copy) => copy.cardId === card.id)
    .reduce<Date | null>(
      (earliest, copy) =>
        earliest === null || copy.createdAt < earliest ? copy.createdAt : earliest,
      null,
    )
  return {
    ...card,
    normalTier: normal?.tierAtMint ?? null,
    foilTier: foil?.tierAtMint ?? null,
    normalPromotedTier: normal?.promotedTier ?? null,
    foilPromotedTier: foil?.promotedTier ?? null,
    stackCount: stackCountsByCard(stacks).get(card.id) ?? 0,
    firstCopyAt,
  }
}

/** Returns the cursor of the sort that starts the next page after the given row. */
export function nextCollectionCursor(sort: CollectionSort, row: CollectionRow): CollectionCursor {
  switch (sort) {
    case 'rarity':
      return { kind: 'rarity', tier: displayTier(row), number: row.number }
    case 'discovery':
      return row.firstCopyAt === null
        ? { kind: 'undiscovered', number: row.number }
        : {
            kind: 'discovered',
            discoveredAt: row.firstCopyAt.getTime(),
            tier: displayTier(row),
            number: row.number,
          }
    case 'number':
      return { kind: 'number', number: row.number }
  }
}

/** Groups other owners' copies into one promoted holder each, at their displayed tier, rarest first then by name. */
export function toPromotedHolders(
  rows: readonly PromotedHolderRow[],
  leagueTier: CardTier,
): PromotedHolder[] {
  const ownerIds = [...new Set(rows.map((row) => row.ownerId))]
  return ownerIds
    .map((ownerId) => {
      const owned = rows.filter((row) => row.ownerId === ownerId)
      return {
        holder: { userId: ownerId, displayUsername: owned[0]?.displayUsername ?? null },
        tier: personalDisplayTier(
          owned.map((row) => row.copy),
          leagueTier,
        ),
      }
    })
    .toSorted(
      (a, b) =>
        tierRank(b.tier) - tierRank(a.tier) ||
        (a.holder.displayUsername ?? '').localeCompare(b.holder.displayUsername ?? '', 'fr'),
    )
    .slice(0, MAX_PROMOTED_HOLDERS)
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
  row: CollectionRow & { firstCopyAt: Date },
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
    isPromoted: isPromoted(rowCopies(row)),
    stackCount: row.stackCount,
    discoveredAt: row.firstCopyAt.toISOString(),
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
    discoveredAt: row.firstCopyAt?.toISOString() ?? null,
  }
}

function toDiscoveredBy(row: CardViewerRow): CardPerson | null {
  if (row.discoveredAt === null) return null
  if (row.discoveredById === null) return { userId: null, displayUsername: null }
  return { userId: row.discoveredById, displayUsername: row.discovererName }
}

function recycleActions(row: CollectionRow): OwnedCardDetail['actions']['recycle'] {
  return rowCopies(row).map((copy) => ({
    variant: copy.variant,
    dust: copyDustValue(copy),
    promotedTier: copy.promotedTier,
  }))
}

/** Decides whether the viewer may raise the personal tier of their copy, shared by the detail and the action. */
export function promotionActionFor(
  row: CollectionRow,
  input: { stack: readonly StackEntry[]; dust: number },
): PromotionAction {
  const decision = promotionDecision({
    copies: rowCopies(row),
    leagueTier: row.tier,
    stack: input.stack,
    dust: input.dust,
  })
  return {
    from: decision.from,
    to: decision.to,
    cost: decision.cost,
    copiesRequired: decision.copiesRequired,
    copiesAvailable: decision.copiesAvailable,
    allowed: decision.allowed,
    reason: decision.reason,
  }
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
  const normal = rowCopies(row).find((copy) => copy.variant === 'normal')
  return foilUpgradeDecision({
    currentTier: row.tier,
    normalValueTier: normal === undefined ? null : copyValueTier(normal),
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
    promotedHolders: ctx.promotedHolders,
    actions: {
      recycle: recycleActions(row),
      foilUpgrade: foilUpgradeDecisionFor(row, ctx.dust),
      stack: ctx.stack,
      promotion: promotionActionFor(row, { stack: ctx.stack, dust: ctx.dust }),
    },
  }
}
