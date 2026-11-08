import { portraitVariantKey, type Portrait, type PortraitKind } from '@storix/shared'
import type { MediaSigner } from '../../lib/media-signer'

/** Maps a stored portrait to its signed 512 px and 128 px urls. */
export function toPortraitView(
  input: { kind: PortraitKind; ownerId: string; uploadId: string; dominantColor: string },
  signer: MediaSigner,
): Portrait {
  const upload = { kind: input.kind, ownerId: input.ownerId, uploadId: input.uploadId }
  return {
    url: signer.urlFor(portraitVariantKey({ ...upload, size: 512 })),
    thumbUrl: signer.urlFor(portraitVariantKey({ ...upload, size: 128 })),
    dominantColor: input.dominantColor,
  }
}
