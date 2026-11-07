import type { HiddenCardDetail as HiddenCardDetailData } from '@storix/shared'
import { Button } from '@/components/ui/button'
import { formatCardNumber } from '../card-number'
import { HiddenCardFace } from './hidden-card-face'

interface HiddenCardDetailProps {
  card: HiddenCardDetailData
  onWithdraw: () => void
}

export function HiddenCardDetail({ card, onWithdraw }: HiddenCardDetailProps) {
  return (
    <div className="flex flex-col items-center gap-4">
      <HiddenCardFace size="xl" tier={card.tier} thumbhash={card.thumbhash} />
      <div className="pills">
        <span className="pill">Masquée</span>
      </div>
      <h2 className="detail-name">{formatCardNumber(card.number)}</h2>
      <p className="m-0 max-w-[32ch] text-center text-sm leading-snug text-muted">
        Cette carte a été masquée par un admin de la ligue. Tu la retrouveras si elle est
        réaffichée.
      </p>
      {card.canWithdraw ? (
        <Button variant="ghost" onClick={onWithdraw}>
          Retirer cette photo
        </Button>
      ) : null}
    </div>
  )
}
