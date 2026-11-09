import { useState } from 'react'
import {
  stackSize,
  type CardTier,
  type ConvertStackBody,
  type CopyVariant,
  type OwnedCardDetail,
} from '@storix/shared'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { TIER_LABELS } from '../tier-labels'
import { ConvertStackSheet } from './convert-stack-sheet'
import { PromotionSheet } from './promotion-sheet'

interface CardActionsProps {
  actions: OwnedCardDetail['actions']
  leagueTier: CardTier
  dust: number
  isBusy: boolean
  promoteError: string | null
  convertError: string | null
  onRecycle: (variant: CopyVariant) => void
  onUpgrade: () => void
  onPromote: (from: CardTier, onDone: () => void) => void
  onConvert: (body: ConvertStackBody, onDone: () => void) => void
  onSheetOpen: () => void
}

type Sheet = 'recycle' | 'promote' | 'convert' | null

const UPGRADE_REASONS = {
  insufficient_dust: 'Il te manque des paillettes',
  foil_owned: 'Tu as déjà la foil',
  no_normal: "Tu n'as pas d'exemplaire normal",
} as const

export function CardActions({
  actions,
  leagueTier,
  dust,
  isBusy,
  promoteError,
  convertError,
  onRecycle,
  onUpgrade,
  onPromote,
  onConvert,
  onSheetOpen,
}: CardActionsProps) {
  const [pending, setPending] = useState<OwnedCardDetail['actions']['recycle'][number] | null>(null)
  const [sheet, setSheet] = useState<Sheet>(null)
  const [session, setSession] = useState(0)
  const { foilUpgrade, promotion } = actions
  const stackCount = stackSize(actions.stack)
  const isMax = promotion.reason === 'max_tier'
  const close = () => setSheet(null)

  function openSheet(next: Exclude<Sheet, null>) {
    onSheetOpen()
    setSession((value) => value + 1)
    setSheet(next)
  }

  function confirmRecycle() {
    if (pending) onRecycle(pending.variant)
    close()
  }

  return (
    <>
      <div className="actions">
        {stackCount > 0 ? (
          <Button variant="ghost" disabled={isBusy} onClick={() => openSheet('convert')}>
            Ta pile · ×{stackCount}
          </Button>
        ) : null}
        <Button variant="primary" disabled={isMax || isBusy} onClick={() => openSheet('promote')}>
          {isMax ? 'Rareté maximale' : 'Améliorer la rareté'}
        </Button>
      </div>
      <div className="actions">
        {actions.recycle.map((option) => (
          <Button
            key={option.variant}
            variant="ghost"
            disabled={isBusy}
            onClick={() => {
              setPending(option)
              setSheet('recycle')
            }}
          >
            {option.variant === 'foil' ? 'Recycler la foil' : 'Recycler'} · +{option.dust}
          </Button>
        ))}
        <Button variant="primary" disabled={!foilUpgrade.allowed || isBusy} onClick={onUpgrade}>
          {foilUpgrade.allowed || !foilUpgrade.reason
            ? `Passer en foil · ${foilUpgrade.cost}`
            : UPGRADE_REASONS[foilUpgrade.reason]}
        </Button>
      </div>
      <Dialog open={sheet === 'recycle'} title="Recycler cette carte ?" onClose={close}>
        <p className="m-0 text-sm text-ink-2">
          Tu gagnes {pending?.dust} paillettes. Tu pourras la retrouver dans un booster.
        </p>
        {pending?.promotedTier ? (
          <p className="m-0 text-sm font-semibold text-danger">
            Ta rareté perso {TIER_LABELS[pending.promotedTier]} ★ sera perdue.
          </p>
        ) : null}
        <Button variant="primary" block onClick={confirmRecycle}>
          Recycler
        </Button>
      </Dialog>
      <PromotionSheet
        open={sheet === 'promote'}
        promotion={promotion}
        leagueTier={leagueTier}
        dust={dust}
        isBusy={isBusy}
        error={promoteError}
        onConfirm={(from) => onPromote(from, close)}
        onClose={close}
      />
      <ConvertStackSheet
        key={session}
        open={sheet === 'convert'}
        stack={actions.stack}
        isBusy={isBusy}
        error={convertError}
        onConfirm={(body) => onConvert(body, close)}
        onClose={close}
      />
    </>
  )
}
