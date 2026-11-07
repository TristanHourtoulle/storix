import type { LockedCardDetail as LockedCardDetailData } from '@storix/shared'
import { Button } from '@/components/ui/button'
import { TIER_LABELS } from '../tier-labels'
import { LockedCardFace } from './locked-card-face'
import { MetaCell, discovererLabel } from './meta-cell'

interface LockedCardDetailProps {
  card: LockedCardDetailData
  onWithdraw: () => void
}

export function LockedCardDetail({ card, onWithdraw }: LockedCardDetailProps) {
  return (
    <div className="flex flex-col items-center gap-4">
      <LockedCardFace size="xl" tier={card.tier} thumbhash={card.thumbhash} />
      <div className="pills">
        <span className="pill">{TIER_LABELS[card.tier]}</span>
      </div>
      <h2 className="detail-name">???</h2>
      <div className="meta">
        <MetaCell label="Photo de" value={card.author.displayUsername ?? 'Ancien membre'} />
        <MetaCell label="Découverte par" value={discovererLabel(card.discoveredBy)} />
      </div>
      {card.canWithdraw ? (
        <Button variant="ghost" onClick={onWithdraw}>
          Retirer cette photo
        </Button>
      ) : null}
    </div>
  )
}
