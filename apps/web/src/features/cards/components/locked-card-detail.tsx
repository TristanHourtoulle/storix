import type { LockedCardDetail as LockedCardDetailData } from '@storix/shared'
import { Button } from '@/components/ui/button'
import { TIER_LABELS } from '../tier-labels'
import { LockedCardFace } from './locked-card-face'
import { authorLabel } from '../author-label'
import { MetaCell, discovererLabel } from './meta-cell'
import { CardSeries } from '@/features/series/components/card-series'

interface LockedCardDetailProps {
  leagueId: string
  card: LockedCardDetailData
  meId: string
  onWithdraw: () => void
}

export function LockedCardDetail({ leagueId, card, meId, onWithdraw }: LockedCardDetailProps) {
  return (
    <div className="flex flex-col items-center gap-4">
      <LockedCardFace size="xl" tier={card.tier} thumbhash={card.thumbhash} />
      <div className="pills">
        <span className="pill">{TIER_LABELS[card.tier]}</span>
      </div>
      <h2 className="detail-name">???</h2>
      <div className="meta">
        <MetaCell label="Photo de" value={authorLabel(card.author)} />
        <MetaCell label="Découverte par" value={discovererLabel(card.discoveredBy)} />
      </div>
      <CardSeries leagueId={leagueId} card={card} meId={meId} />
      {card.canWithdraw ? (
        <Button variant="ghost" onClick={onWithdraw}>
          Retirer cette photo
        </Button>
      ) : null}
    </div>
  )
}
