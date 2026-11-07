import { Button } from '@/components/ui/button'
import { Notice } from '@/components/ui/notice'
import { Dialog } from '@/components/ui/dialog'
import { formatCardNumber } from '@/features/cards/card-number'

interface WithdrawCardDialogProps {
  number: number | null
  onConfirm: () => void
  onClose: () => void
  isPending: boolean
  hasError: boolean
}

export function WithdrawCardDialog({
  number,
  onConfirm,
  onClose,
  isPending,
  hasError,
}: WithdrawCardDialogProps) {
  const title =
    number === null
      ? 'Retirer la carte ?'
      : `Retirer la carte ${formatCardNumber(number)} de la ligue ?`

  return (
    <Dialog open={number !== null} title={title} onClose={onClose} isDismissible={!isPending}>
      <p className="m-0 text-sm text-ink-2">
        Elle disparaît pour tout le monde et ses propriétaires sont remboursés en paillettes. C'est
        irréversible.
      </p>
      {hasError ? <Notice tone="error">Retrait impossible pour le moment. Réessaie.</Notice> : null}
      <Button variant="primary" block isLoading={isPending} onClick={onConfirm}>
        Retirer
      </Button>
    </Dialog>
  )
}
