import {
  canReact,
  canWithdrawCard,
  craftDecision,
  DEFAULT_NEW_CARD_DELAY_MINUTES,
  dustValue,
  foilUpgradeDecision,
  isBoosterEligible,
  type CardPerson,
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

function isOwned(row: CollectionRow): boolean {
  return row.normalTier !== null || row.foilTier !== null
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
    displayTier: row.displayTier,
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
      craft: craftDecision({
        currentTier: row.tier,
        ownsAnyCopy: false,
        isBoosterEligible: isBoosterEligible(
          row.createdAt,
          ctx.now,
          DEFAULT_NEW_CARD_DELAY_MINUTES,
        ),
        dust: ctx.dust,
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
    canReact: canReact({ isAuthor, ownsCopy: true }),
    canWithdraw,
    actions: {
      recycle: ownedCopies(row),
      foilUpgrade: foilUpgradeDecision({
        currentTier: row.tier,
        ownsNormal: row.normalTier !== null,
        ownsFoil: row.foilTier !== null,
        dust: ctx.dust,
      }),
    },
  }
}
