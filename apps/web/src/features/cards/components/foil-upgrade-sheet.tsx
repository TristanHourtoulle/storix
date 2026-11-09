import { FOIL_DUST_MULTIPLIER } from '@storix/shared'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Notice } from '@/components/ui/notice'

interface FoilUpgradeSheetProps {
  open: boolean
  cost: number
  normalValue: number
  canConfirm: boolean
  isBusy: boolean
  error: string | null
  onConfirm: () => void
  onClose: () => void
}

export function FoilUpgradeSheet({
  open,
  cost,
  normalValue,
  canConfirm,
  isBusy,
  error,
  onConfirm,
  onClose,
}: FoilUpgradeSheetProps) {
  return (
    <Dialog open={open} title="Passer en foil ?" isDismissible={!isBusy} onClose={onClose}>
      <p className="m-0 text-sm text-ink-2">
        Ton exemplaire normal devient foil : reflet cyan, et il vaudra{' '}
        {normalValue * FOIL_DUST_MULTIPLIER} paillettes au lieu de {normalValue}.
      </p>
      {error ? <Notice tone="error">{error}</Notice> : null}
      <Button variant="primary" block disabled={!canConfirm} isLoading={isBusy} onClick={onConfirm}>
        Passer en foil · {cost} paillettes
      </Button>
    </Dialog>
  )
}
