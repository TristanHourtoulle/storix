import type { BoosterPull, MediaVariantSize } from '@storix/shared'
import type { MediaSigner } from '../../lib/media-signer'
import { toCardAuthor } from '../cards/card-views'
import { toImageSet } from '../cards/image-set'
import type { PullViewRow } from './boosters.repository'

const PULL_SIZES: readonly MediaVariantSize[] = [256, 768]

/** Projects a stored pull to its API shape, showing the card at its tier at mint. */
export function toBoosterPull(row: PullViewRow, signer: MediaSigner): BoosterPull {
  return {
    slot: row.slot,
    card: {
      id: row.cardId,
      number: row.number,
      title: row.title,
      tier: row.tierAtMint,
      author: toCardAuthor(row),
      thumbhash: row.thumbhash,
      dominantColor: row.dominantColor,
      width: row.width,
      height: row.height,
      image: toImageSet(row.variants, PULL_SIZES, signer),
      capturedAt: row.capturedAt?.toISOString() ?? null,
    },
    variant: row.variant,
    outcome: row.outcome,
    dust: row.dust,
    isFirstCopy: row.isFirstCopy,
    isDiscovery: row.isDiscovery,
  }
}
