import { useEffect, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { tierRank, type CardTier, type OwnedCardDetail } from '@storix/shared'
import { Button } from '@/components/ui/button'
import { useModalLayer } from '@/components/crop/use-modal-layer'
import { playSound } from '@/features/sound/sound'
import { TIER_CLASS, TIER_COLOR_VAR, TIER_LABELS } from '../tier-labels'
import { CardImage } from './card-image'

export type Celebration =
  { kind: 'promote'; from: CardTier; to: CardTier } | { kind: 'foil'; tier: CardTier }

interface PromotionCelebrationProps {
  card: OwnedCardDetail
  celebration: Celebration
  onShare: () => void
  onClose: () => void
}

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'
const AURA_AT_MS = 900
const STAMP_AT_MS = 1250
const FINAL_AT_MS = 1900
const FOIL_BURST_AT_MS = 500
const FOIL_FINAL_AT_MS = 1300
const AURA_SECONDS = 1.2
const MYTHIC_AURA_SECONDS = 2.4
const BIG_CARD_SIZES = '160px'

function prefersReducedMotion(): boolean {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches
}

function scheduleSounds(celebration: Celebration): number[] {
  if (celebration.kind === 'foil') {
    return [window.setTimeout(() => playSound({ name: 'burst' }), FOIL_BURST_AT_MS)]
  }
  const level = tierRank(celebration.to)
  const duration = celebration.to === 'mythic' ? MYTHIC_AURA_SECONDS : AURA_SECONDS
  return [
    window.setTimeout(() => playSound({ name: 'aura', level, duration }), AURA_AT_MS),
    window.setTimeout(() => playSound({ name: 'stamp', level }), STAMP_AT_MS),
  ]
}

/**
 * The upgrade celebration: the card rises, its aura switches to the new tier with a glare and
 * a ★ stamps its corner, then "Partager" and "Super". Tapping skips to the end; reduced motion
 * shows the end directly. A foil upgrade plays the short version.
 */
export function PromotionCelebration({
  card,
  celebration,
  onShare,
  onClose,
}: PromotionCelebrationProps) {
  const { container, layerRef } = useModalLayer(onClose)
  const [isReduced] = useState(prefersReducedMotion)
  const [isFinal, setIsFinal] = useState(isReduced)
  const [isOn, setIsOn] = useState(false)
  const isFoil = celebration.kind === 'foil'
  const to = isFoil ? celebration.tier : celebration.to
  const from = isFoil ? celebration.tier : celebration.from
  const style = { '--tc': TIER_COLOR_VAR[to], '--from': TIER_COLOR_VAR[from] } as CSSProperties

  useEffect(() => {
    if (isReduced) return undefined
    const enter = window.requestAnimationFrame(() => setIsOn(true))
    const sounds = scheduleSounds(celebration)
    const final = window.setTimeout(
      () => setIsFinal(true),
      celebration.kind === 'foil' ? FOIL_FINAL_AT_MS : FINAL_AT_MS,
    )
    return () => {
      window.cancelAnimationFrame(enter)
      sounds.forEach((timer) => window.clearTimeout(timer))
      window.clearTimeout(final)
    }
  }, [celebration, isReduced])

  const classes = [
    'celeb',
    isFoil ? 'is-foil' : '',
    isOn || isFinal ? 'is-on' : '',
    isFinal ? 'is-final' : '',
  ]

  return createPortal(
    <div
      ref={layerRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={isFoil ? 'Copie passée en foil' : 'Rareté améliorée'}
      className={classes.filter(Boolean).join(' ')}
      style={style}
      onClick={() => setIsFinal(true)}
    >
      <span className="celeb-rays" aria-hidden="true" />
      <span className={`celeb-card ${to === 'mythic' ? TIER_CLASS.mythic : ''}`} aria-hidden="true">
        <CardImage
          image={card.image}
          thumbhash={card.thumbhash}
          width={card.width}
          height={card.height}
          sizes={BIG_CARD_SIZES}
          isEager
        />
        {isFoil ? null : <span className="celeb-star">★</span>}
      </span>
      <span className="celeb-text" aria-live="polite">
        <span className="celeb-tierline">
          {isFoil
            ? 'Foil'
            : `${TIER_LABELS[from]}${card.isPromoted && tierRank(from) > tierRank(card.tier) ? ' ★' : ''} → ${TIER_LABELS[to]} ★`}
        </span>
        <b>{card.title}</b>
        <small>
          {isFoil
            ? 'Ta copie est brillante.'
            : `Ta copie brille maintenant en ${TIER_LABELS[to]}. La ligue est prévenue.`}
        </small>
      </span>
      <span className="celeb-cta">
        <Button
          variant="ghost"
          tabIndex={isFinal ? 0 : -1}
          onClick={(event) => {
            event.stopPropagation()
            onShare()
          }}
        >
          Partager
        </Button>
        <Button
          variant="primary"
          tabIndex={isFinal ? 0 : -1}
          onClick={(event) => {
            event.stopPropagation()
            onClose()
          }}
        >
          Super
        </Button>
      </span>
    </div>,
    container,
  )
}
