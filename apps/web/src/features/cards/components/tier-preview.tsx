import type { CardTier, OwnedCardDetail } from '@storix/shared'
import { Icon } from '@/components/ui/icon'
import { TIER_LABELS } from '../tier-labels'
import { OwnedCardFace } from './owned-card-face'

interface TierPreviewProps {
  card: OwnedCardDetail
  from: CardTier
  to: CardTier
  isReady: boolean
}

export function TierPreview({ card, from, to, isReady }: TierPreviewProps) {
  return (
    <div
      className="tier-preview"
      role="img"
      aria-label={`${TIER_LABELS[from]} vers ${TIER_LABELS[to]} ★`}
    >
      <OwnedCardFace
        card={card}
        size="md"
        tier={from}
        className="tier-preview-now"
        hasStack={false}
        imageSizes="104px"
      />
      <span className="tier-preview-arrow">
        <Icon name="arrow" className="size-5" />
      </span>
      <div className={isReady ? 'tier-preview-next' : 'tier-preview-next is-locked'}>
        <OwnedCardFace
          card={card}
          size="md"
          tier={to}
          isPromoted
          hasStack={false}
          imageSizes="128px"
        />
        {isReady ? null : (
          <span className="tier-preview-lock">
            <Icon name="lock" className="size-5" />
          </span>
        )}
      </div>
    </div>
  )
}
