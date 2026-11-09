import type { OwnedCardDetail } from '@storix/shared'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { TIER_LABELS } from '../tier-labels'

type RecycleOption = OwnedCardDetail['actions']['recycle'][number]

interface RecycleSheetProps {
  open: boolean
  option: RecycleOption | null
  isBusy: boolean
  onConfirm: () => void
  onClose: () => void
}

export function RecycleSheet({ open, option, isBusy, onConfirm, onClose }: RecycleSheetProps) {
  return (
    <Dialog open={open} title="Recycler cette carte ?" onClose={onClose}>
      <p className="m-0 text-sm text-ink-2">
        Tu gagnes {option?.dust} paillettes. Tu pourras la retrouver dans un booster.
      </p>
      {option?.promotedTier ? (
        <p className="m-0 text-sm font-semibold text-danger">
          Ta rareté perso {TIER_LABELS[option.promotedTier]} ★ sera perdue.
        </p>
      ) : null}
      <Button variant="danger" block disabled={isBusy} onClick={onConfirm}>
        Recycler · +{option?.dust}
      </Button>
    </Dialog>
  )
}
