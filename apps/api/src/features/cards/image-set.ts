import {
  type ImageSet,
  type MediaFormat,
  type MediaVariant,
  type MediaVariantSize,
} from '@storix/shared'
import type { MediaSigner } from '../../lib/media-signer'

function sourcesFor(
  variants: readonly MediaVariant[],
  sizes: readonly MediaVariantSize[],
  format: MediaFormat,
  signer: MediaSigner,
) {
  return variants
    .filter((variant) => variant.format === format && sizes.includes(variant.size))
    .toSorted((a, b) => a.width - b.width)
    .map((variant) => ({ url: signer.urlFor(variant.key), width: variant.width }))
}

/** Builds a signed image set from the selected variant sizes, ascending by width. */
export function toImageSet(
  variants: readonly MediaVariant[],
  sizes: readonly MediaVariantSize[],
  signer: MediaSigner,
): ImageSet {
  return {
    avif: sourcesFor(variants, sizes, 'avif', signer),
    webp: sourcesFor(variants, sizes, 'webp', signer),
  }
}
