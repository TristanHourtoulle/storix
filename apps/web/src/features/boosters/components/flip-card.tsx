import { m, useReducedMotion } from 'motion/react'
import type { BoosterPull } from '@storix/shared'
import { CardFace } from '@/features/cards/components/card-face'
import { CardImage } from '@/features/cards/components/card-image'
import { TIER_LABELS } from '@/features/cards/tier-labels'
import { CardBack } from './card-back'

interface FlipCardProps {
  pull: BoosterPull
  isRevealed: boolean
  isReady: boolean
  onReveal: () => void
  registerImage: (img: HTMLImageElement | null) => void
}

const FLIP_SPRING = { type: 'spring', duration: 0.5, bounce: 0.25 } as const

function dustLabel(pull: BoosterPull): string {
  if (pull.outcome === 'new') return ''
  const gain = `+${pull.dust} paillettes`
  return pull.outcome === 'upgraded' ? `Améliorée · ${gain}` : gain
}

export function FlipCard({ pull, isRevealed, isReady, onReveal, registerImage }: FlipCardProps) {
  const { card } = pull
  const isReduced = useReducedMotion()
  const label = isRevealed
    ? `${card.title}, ${TIER_LABELS[card.tier]}`
    : `Retourner la carte ${pull.slot + 1}`

  return (
    <div className="hand-item">
      <m.button
        type="button"
        className="flip"
        aria-label={label}
        disabled={!isReady}
        onClick={onReveal}
        initial={false}
        animate={{ rotateY: isRevealed ? 180 : 0 }}
        transition={FLIP_SPRING}
        style={{ transformStyle: 'preserve-3d' }}
      >
        <span className="flip-face">
          <CardBack tier={card.tier} isShimmering={!isReady} />
        </span>
        <m.span
          className={`flip-face flip-front ${pull.variant === 'foil' ? 'foil' : ''}`}
          initial={false}
          animate={{ opacity: isReduced && !isRevealed ? 0 : 1 }}
          transition={{ duration: 0.25 }}
        >
          <CardFace size="sm" title={card.title} tier={card.tier} isProvisional={false}>
            <CardImage
              image={card.image}
              thumbhash={card.thumbhash}
              width={card.width}
              height={card.height}
              sizes="80px"
              isEager
              isHighPriority
              onImageRef={registerImage}
            />
          </CardFace>
        </m.span>
      </m.button>
      <span className="dup">{isRevealed ? dustLabel(pull) : ''}</span>
    </div>
  )
}
