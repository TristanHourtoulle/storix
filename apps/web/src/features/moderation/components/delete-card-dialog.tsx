import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Notice } from '@/components/ui/notice'
import { formatCardNumber } from '@/features/cards/card-number'

interface DeleteCardDialogProps {
  open: boolean
  number: number
  copiesInLeague: number
  isPending: boolean
  errorMessage: string | null
  onCancel: () => void
  onConfirm: () => void
}

export function DeleteCardDialog({
  open,
  number,
  copiesInLeague,
  isPending,
  errorMessage,
  onCancel,
  onConfirm,
}: DeleteCardDialogProps) {
  const title = `Supprimer définitivement la carte ${formatCardNumber(number)} ?`

  return (
    <Dialog open={open} title={title} onClose={onCancel} isDismissible={!isPending}>
      <p className="m-0 text-sm text-ink-2">
        {`Elle disparaît de toutes les collections. Les ${copiesInLeague} exemplaires sont remboursés en paillettes. C'est irréversible.`}
      </p>
      {errorMessage ? <Notice tone="error">{errorMessage}</Notice> : null}
      <div className="flex gap-2">
        <Button variant="ghost" className="flex-1" onClick={onCancel} disabled={isPending}>
          Annuler
        </Button>
        <Button
          variant="primary"
          className="flex-1 !bg-danger"
          onClick={onConfirm}
          isLoading={isPending}
        >
          Supprimer
        </Button>
      </div>
    </Dialog>
  )
}
