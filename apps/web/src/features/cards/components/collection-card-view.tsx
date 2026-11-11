import type { CardTier, CollectionCard } from '@storix/shared'
import { CardFace } from './card-face'
import { CardImage } from './card-image'
import { HiddenCardFace } from './hidden-card-face'
import { LockedCardFace } from './locked-card-face'

interface CollectionCardViewProps {
  card: CollectionCard
  size: 'sm' | 'md' | 'lg' | 'xl'
  sizes: string
  isEager?: boolean
  /** Overrides the tier badge and glow, e.g. with the tier a reveal was minted at. */
  tier?: CardTier
}

export function CollectionCardView({
  card,
  size,
  sizes,
  isEager = false,
  tier,
}: CollectionCardViewProps) {
  if (card.kind === 'locked') {
    return <LockedCardFace size={size} tier={tier ?? card.tier} thumbhash={card.thumbhash} />
  }
  if (card.kind === 'hidden') {
    return <HiddenCardFace size={size} tier={tier ?? card.tier} thumbhash={card.thumbhash} />
  }
  if (card.kind === 'unpulled') {
    return (
      <CardFace
        size={size}
        title={card.title}
        tier={tier ?? card.tier}
        isProvisional={card.isProvisional}
        moment={card.moment}
        band={
          <div className="card-band">
            <span className="card-name">{card.title}</span>
            <span className="card-unpulled">Pas encore tirée</span>
          </div>
        }
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
  const isFoilOnly = card.copies.foil !== null && card.copies.normal === null

  return (
    <CardFace
      size={size}
      title={card.title}
      tier={tier ?? card.displayTier}
      isProvisional={card.isProvisional}
      isFoil={isFoilOnly}
      hasFoilPip={card.copies.foil !== null}
      isPromoted={tier === undefined && card.isPromoted}
      stackCount={card.stackCount}
      moment={card.moment}
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
