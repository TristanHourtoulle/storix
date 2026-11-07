import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { formatCardNumber } from '@/features/cards/card-number'

interface WithdrawCardDialogProps {
  number: number | null
  onConfirm: () => void
  onClose: () => void
  isPending: boolean
}

export function WithdrawCardDialog({
  number,
  onConfirm,
  onClose,
  isPending,
}: WithdrawCardDialogProps) {
  const label = number === null ? '' : formatCardNumber(number)

  return (
    <Dialog
      open={number !== null}
      title={`Retirer la carte ${label} de la ligue ?`}
      onClose={onClose}
      isDismissible={!isPending}
    >
      <p className="m-0 text-sm text-ink-2">
        Elle disparaît pour tout le monde et ses propriétaires sont remboursés en paillettes. C'est
        irréversible.
      </p>
      <Button variant="primary" block isLoading={isPending} onClick={onConfirm}>
        Retirer
      </Button>
    </Dialog>
  )
}
