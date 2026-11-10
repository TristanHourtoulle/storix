import {
  boosterEligibleAt,
  BOUND_TIERS,
  COMPUTED_TIERS,
  type AdminCard,
  type BoundTier,
  type CardTier,
  type ComputedTier,
  type MediaVariantSize,
} from '@storix/shared'
import type { MediaSigner } from '../../lib/media-signer'
import { toCardAuthor } from '../cards/card-views'
import { toImageSet } from '../cards/image-set'
import type { AdminCardRow } from './moderation.repository'

const ADMIN_SIZES: readonly MediaVariantSize[] = [256, 768]

export interface AdminCardContext {
  signer: MediaSigner
  delayMinutes: number
}

/** Narrows a stored tier to a computed tier, or null when it is unset. */
export function asComputedTier(tier: CardTier | null): ComputedTier | null {
  return COMPUTED_TIERS.find((computed) => computed === tier) ?? null
}

/** Narrows a stored tier to an admin bound tier, or null when it is unset or Mythic. */
export function asBoundTier(tier: CardTier | null): BoundTier | null {
  return BOUND_TIERS.find((bound) => bound === tier) ?? null
}

/** Projects a card to the admin moderation view, which always carries the image. */
export function toAdminCard(row: AdminCardRow, ctx: AdminCardContext): AdminCard {
  return {
    id: row.id,
    number: row.number,
    title: row.title,
    status: row.status,
    tier: row.tier,
    computedTier: asComputedTier(row.computedTier),
    tierSource: row.tierSource,
    pinnedTier: row.pinnedTier,
    minTier: asBoundTier(row.minTier),
    maxTier: asBoundTier(row.maxTier),
    author: toCardAuthor(row),
    capturedAt: row.capturedAt?.toISOString() ?? null,
    isCaptureDateValidated: row.isCaptureDateValidated,
    createdAt: row.createdAt.toISOString(),
    boosterEligibleAt: boosterEligibleAt(row.createdAt, ctx.delayMinutes).toISOString(),
    copiesInLeague: row.copiesInLeague,
    thumbhash: row.thumbhash,
    dominantColor: row.dominantColor,
    width: row.width,
    height: row.height,
    image: toImageSet(row.variants, ADMIN_SIZES, ctx.signer),
  }
}
