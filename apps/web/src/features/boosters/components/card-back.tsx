import type { CardTier } from '@storix/shared'
import { TIER_GLOW_CLASS } from '@/features/cards/tier-labels'

interface CardBackProps {
  tier: CardTier
  isShimmering?: boolean
}

export function CardBack({ tier, isShimmering = false }: CardBackProps) {
  return (
    <div className={`card sm back ${TIER_GLOW_CLASS[tier]} ${isShimmering ? 'shimmer' : ''}`}>
      <div className="back-face">STORIX</div>
    </div>
  )
}
