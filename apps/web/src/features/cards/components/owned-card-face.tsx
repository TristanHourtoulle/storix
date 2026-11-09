import type { CardTier, OwnedCardDetail } from '@storix/shared'
import { CardFace, type CardFaceProps } from './card-face'
import { CardImage } from './card-image'

interface OwnedCardFaceProps {
  card: OwnedCardDetail
  size: CardFaceProps['size']
  imageSizes: string
  tier?: CardTier
  isPromoted?: boolean
  hasStack?: boolean
  isEager?: boolean
  className?: string
}

export function OwnedCardFace({
  card,
  size,
  imageSizes,
  tier,
  isPromoted,
  hasStack = true,
  isEager = false,
  className,
}: OwnedCardFaceProps) {
  const hasFoil = card.copies.foil !== null

  return (
    <CardFace
      size={size}
      title={card.title}
      tier={tier ?? card.displayTier}
      isProvisional={card.isProvisional}
      isFoil={hasFoil}
      hasFoilPip={hasFoil}
      isPromoted={isPromoted ?? card.isPromoted}
      stackCount={hasStack ? card.stackCount : 0}
      className={className}
    >
      <CardImage
        image={card.image}
        thumbhash={card.thumbhash}
        width={card.width}
        height={card.height}
        sizes={imageSizes}
        isEager={isEager}
      />
    </CardFace>
  )
}
