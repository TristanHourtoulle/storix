import type { CollectionCard } from '@storix/shared'
import { CardFace } from './card-face'
import { CardImage } from './card-image'
import { LockedCardFace } from './locked-card-face'

interface CollectionCardViewProps {
  card: CollectionCard
  size: 'sm' | 'md' | 'lg' | 'xl'
  sizes: string
  isEager?: boolean
}

export function CollectionCardView({
  card,
  size,
  sizes,
  isEager = false,
}: CollectionCardViewProps) {
  if (card.kind === 'locked') {
    return <LockedCardFace size={size} tier={card.tier} thumbhash={card.thumbhash} />
  }
  if (card.kind === 'hidden') {
    return (
      <LockedCardFace size={size} tier={card.tier} thumbhash={card.thumbhash} label="Masquée" />
    )
  }
  const isFoilOnly = card.copies.foil !== null && card.copies.normal === null

  return (
    <CardFace
      size={size}
      title={card.title}
      tier={card.displayTier}
      isProvisional={card.isProvisional}
      isFoil={isFoilOnly}
      hasFoilPip={card.copies.foil !== null}
    >
      <CardImage
        image={card.image}
        thumbhash={card.thumbhash}
        width={card.width}
        height={card.height}
        sizes={sizes}
        isEager={isEager}
        isHighPriority={isEager}
      />
    </CardFace>
  )
}
