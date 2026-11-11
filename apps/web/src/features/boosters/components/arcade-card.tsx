import type { BoosterPull, CardTier } from '@storix/shared'
import type { ReactNode } from 'react'
import { CardFace, type CardFaceProps } from '@/features/cards/components/card-face'
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
  size?: CardFaceProps['size']
  imageSizes?: string
  isHighPriority?: boolean
  registerImage?: (img: HTMLImageElement | null) => void
}

export function PulledFace({
  pull,
  size = 'lg',
  imageSizes = '220px',
  isHighPriority = false,
  registerImage,
}: PulledFaceProps) {
  const { card } = pull
  return (
    <CardFace
      size={size}
      title={card.title}
      tier={card.tier}
      isProvisional={false}
      isFoil={pull.variant === 'foil'}
      moment={card.moment}
    >
      <CardImage
        image={card.image}
        thumbhash={card.thumbhash}
        width={card.width}
        height={card.height}
        sizes={imageSizes}
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

interface ArcadeCardShellProps {
  tier: CardTier
  front: ReactNode
}

/** Arcade card markup (aura, rings, flipper, back and dim) around any front face. */
export function ArcadeCardShell({ tier, front }: ArcadeCardShellProps) {
  return (
    <div className="ar-card" data-t={tierKey(tier)}>
      <div className="ar-aura">
        <div className="ar-aura-spin" />
      </div>
      <div className="ar-rings" />
      <div className="ar-flipper">
        <div className="ar-face ar-back">
          <CardBackArt />
        </div>
        <div className="ar-face ar-front">{front}</div>
      </div>
      <div className="ar-dim" />
    </div>
  )
}

export function ArcadeCard({ pull, registerImage }: ArcadeCardProps) {
  return (
    <ArcadeCardShell
      tier={pull.card.tier}
      front={<PulledFace pull={pull} isHighPriority registerImage={registerImage} />}
    />
  )
}
