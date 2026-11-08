import type { ImageSet } from '@storix/shared'
import { CARD_CROP_FRAME, type ImageSize } from '@storix/shared/domain'
import { CroppedImage } from '@/components/crop/cropped-image'
import type { StackCard } from '../session/session-reducer'

export interface CardImageSource {
  src: string
  image?: ImageSet
  size: ImageSize
}

function largestWebp(image: ImageSet): string {
  const largest = image.webp.reduce<ImageSet['webp'][number] | null>(
    (best, source) => (best === null || source.width > best.width ? source : best),
    null,
  )
  return largest?.url ?? ''
}

/** The image a card shows: the local prepared photo, or the signed server image of a resumed draft. */
export function cardImageOf(card: StackCard): CardImageSource | null {
  if (!card.size) return null
  if (card.photo) return { src: card.photo.previewUrl, size: card.size }
  if (card.remote) {
    return { src: largestWebp(card.remote.image), image: card.remote.image, size: card.size }
  }
  return null
}

interface StackCardArtProps {
  card: StackCard
  sizes: string
}

/** The photo of a stack card through its crop, or a quiet placeholder while it is prepared. */
export function StackCardArt({ card, sizes }: StackCardArtProps) {
  const source = cardImageOf(card)
  if (!source) return <span className="absolute inset-0 animate-pulse bg-surface-2" />
  return (
    <CroppedImage
      src={source.src}
      image={source.image}
      sizes={sizes}
      imageSize={source.size}
      crop={card.crop}
      frame={CARD_CROP_FRAME}
      className="absolute inset-0 size-full"
    />
  )
}
