import { useState } from 'react'
import type { LockedCardDetail as LockedCardDetailData } from '@storix/shared'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { TIER_LABELS } from '../tier-labels'
import { LockedCardFace } from './locked-card-face'
import { MetaCell, discovererLabel } from './meta-cell'

interface LockedCardDetailProps {
  card: LockedCardDetailData
  dust: number | undefined
  isBusy?: boolean
  onCraft: () => void
  onWithdraw: () => void
}

function craftBlockedLabel(card: LockedCardDetailData, dust: number | undefined): string | null {
  const { craft } = card
  if (craft.allowed) return null
  if (craft.reason === 'not_craftable') return 'Les Mythiques ne se fabriquent pas'
  if (craft.reason === 'provisional') return 'Pas encore dans les boosters'
  if (craft.reason === 'owned') return 'Tu possèdes déjà cette carte'
  const missing = Math.max(0, (craft.cost ?? 0) - (dust ?? 0))
  return `Il te manque ${missing} paillettes`
}

export function LockedCardDetail({
  card,
  dust,
  isBusy = false,
  onCraft,
  onWithdraw,
}: LockedCardDetailProps) {
  const [isConfirming, setIsConfirming] = useState(false)
  const blockedLabel = craftBlockedLabel(card, dust)
  const cost = card.craft.cost ?? 0

  function confirm() {
    setIsConfirming(false)
    onCraft()
  }

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
      <Button
        variant="primary"
        block
        disabled={blockedLabel !== null || isBusy}
        onClick={() => setIsConfirming(true)}
      >
        {blockedLabel ?? `Fabriquer · ${cost} paillettes`}
      </Button>
      {card.canWithdraw ? (
        <Button variant="ghost" onClick={onWithdraw}>
          Retirer cette photo
        </Button>
      ) : null}
      <Dialog
        open={isConfirming}
        title="Fabriquer cette carte ?"
        onClose={() => setIsConfirming(false)}
      >
        <p className="m-0 text-sm text-ink-2">Cela coûte {cost} paillettes.</p>
        <Button variant="primary" block onClick={confirm}>
          Fabriquer · {cost} paillettes
        </Button>
      </Dialog>
    </div>
  )
}
