import { useState } from 'react'
import type { CopyVariant, OwnedCardDetail } from '@storix/shared'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'

interface CardActionsProps {
  actions: OwnedCardDetail['actions']
  isBusy: boolean
  onRecycle: (variant: CopyVariant) => void
  onUpgrade: () => void
}

const UPGRADE_REASONS = {
  insufficient_dust: 'Il te manque des paillettes',
  foil_owned: 'Tu as déjà la foil',
  no_normal: "Tu n'as pas d'exemplaire normal",
} as const

export function CardActions({ actions, isBusy, onRecycle, onUpgrade }: CardActionsProps) {
  const [pending, setPending] = useState<OwnedCardDetail['actions']['recycle'][number] | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const { foilUpgrade } = actions

  function confirm() {
    if (pending) onRecycle(pending.variant)
    setIsOpen(false)
  }

  return (
    <>
      <div className="actions">
        {actions.recycle.map((option) => (
          <Button
            key={option.variant}
            variant="ghost"
            disabled={isBusy}
            onClick={() => {
              setPending(option)
              setIsOpen(true)
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
      <Dialog open={isOpen} title="Recycler cette carte ?" onClose={() => setIsOpen(false)}>
        <p className="m-0 text-sm text-ink-2">
          Tu gagnes {pending?.dust} paillettes. Tu pourras la retrouver dans un booster.
        </p>
        <Button variant="primary" block onClick={confirm}>
          Recycler
        </Button>
      </Dialog>
    </>
  )
}
