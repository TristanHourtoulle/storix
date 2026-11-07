import type { BoosterPull } from '@storix/shared'
import { CardFace } from '@/features/cards/components/card-face'
import { CardImage } from '@/features/cards/components/card-image'
import { tierKey } from '../arcade/tiers'

const SPARKLE = 'M50 35Q52.25 47.75 65 50Q52.25 52.25 50 65Q47.75 52.25 35 50Q47.75 47.75 50 35Z'

export function CardBackArt() {
  return (
    <>
      <div className="ar-bk-pat" />
      <div className="ar-bk-frame" />
      <div className="ar-bk-mark">
        <svg viewBox="35 35 30 30" aria-hidden="true">
          <path d={SPARKLE} fill="#F2F2F7" />
        </svg>
      </div>
      <div className="ar-bk-word">STORIX</div>
    </>
  )
}

interface PulledFaceProps {
  pull: BoosterPull
  isHighPriority?: boolean
  registerImage?: (img: HTMLImageElement | null) => void
}

export function PulledFace({ pull, isHighPriority = false, registerImage }: PulledFaceProps) {
  const { card } = pull
  return (
    <CardFace
      size="lg"
      title={card.title}
      tier={card.tier}
      isProvisional={false}
      isFoil={pull.variant === 'foil'}
    >
      <CardImage
        image={card.image}
        thumbhash={card.thumbhash}
        width={card.width}
        height={card.height}
        sizes="220px"
        isEager
        isHighPriority={isHighPriority}
        onImageRef={registerImage}
      />
    </CardFace>
  )
}

interface ArcadeCardProps {
  pull: BoosterPull
  registerImage: (img: HTMLImageElement | null) => void
}

export function ArcadeCard({ pull, registerImage }: ArcadeCardProps) {
  return (
    <div className="ar-card" data-t={tierKey(pull.card.tier)}>
      <div className="ar-aura">
        <div className="ar-aura-spin" />
      </div>
      <div className="ar-rings" />
      <div className="ar-flipper">
        <div className="ar-face ar-back">
          <CardBackArt />
        </div>
        <div className="ar-face ar-front">
          <PulledFace pull={pull} isHighPriority registerImage={registerImage} />
        </div>
      </div>
      <div className="ar-dim" />
    </div>
  )
}
