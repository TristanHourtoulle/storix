import type { CardTier } from '@storix/shared'
import { Icon } from '@/components/ui/icon'
import { raritySetClass } from '@/features/cosmetics/cosmetic-skins'
import { useEquippedStyle } from '@/features/cosmetics/style-context'
import { TIER_CLASS } from '../tier-labels'
import { useThumbhashUrl } from '../use-thumbhash-url'

interface HiddenCardFaceProps {
  size: 'sm' | 'md' | 'lg' | 'xl'
  tier: CardTier
  thumbhash: string
}

/** Silhouette of a card an admin hid: a blurred thumbhash only, never an image request. */
export function HiddenCardFace({ size, tier, thumbhash }: HiddenCardFaceProps) {
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
      <Icon name="eye-off" className="locked-icon" />
      <div className="card-band">
        <span className="card-name">???</span>
        <span className="card-tier">Masquée</span>
      </div>
    </div>
  )
}
