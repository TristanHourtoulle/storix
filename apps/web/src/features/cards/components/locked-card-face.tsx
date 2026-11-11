import type { CardTier } from '@storix/shared'
import { Icon } from '@/components/ui/icon'
import { raritySetClass } from '@/features/cosmetics/cosmetic-skins'
import { useEquippedStyle } from '@/features/cosmetics/style-context'
import { TIER_CLASS, TIER_LABELS } from '../tier-labels'
import { useThumbhashUrl } from '../use-thumbhash-url'

interface LockedCardFaceProps {
  size: 'sm' | 'md' | 'lg' | 'xl'
  tier: CardTier
  thumbhash: string
}

export function LockedCardFace({ size, tier, thumbhash }: LockedCardFaceProps) {
  const placeholder = useThumbhashUrl(thumbhash)
  const raritySet = raritySetClass(useEquippedStyle().raritySet)

  return (
    <div
      className={`card ${size} locked-tier ${TIER_CLASS[tier]}${raritySet ? ` ${raritySet}` : ''}`}
    >
      <div className="card-art locked-art">
        <div
          className="locked-blur"
          style={placeholder ? { backgroundImage: `url(${placeholder})` } : undefined}
        />
      </div>
      <div className="locked-veil" />
      {raritySet ? <span className="card-frame" aria-hidden="true" /> : null}
      <Icon name="lock" className="locked-icon" />
      <div className="card-band">
        <span className="card-name">???</span>
        <span className="card-tier">{TIER_LABELS[tier]}</span>
      </div>
    </div>
  )
}
