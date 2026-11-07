import type { MemberSummary } from '@storix/shared'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Notice } from '@/components/ui/notice'

interface TransferOwnershipDialogProps {
  member: MemberSummary
  isPending: boolean
  errorMessage: string | null
  onConfirm: () => void
  onClose: () => void
}

export function TransferOwnershipDialog({
  member,
  isPending,
  errorMessage,
  onConfirm,
  onClose,
}: TransferOwnershipDialogProps) {
  const name = member.displayUsername

  return (
    <Dialog
      open
      title={`Transférer la ligue à ${name} ?`}
      onClose={onClose}
      isDismissible={!isPending}
    >
      <p className="m-0 text-sm leading-snug text-muted">
        Tu deviens admin. {name} pourra générer les codes de réinitialisation des membres dont c'est
        la ligue d'origine.
      </p>
      {errorMessage ? <Notice tone="error">{errorMessage}</Notice> : null}
      <div className="flex gap-2">
        <Button variant="ghost" block disabled={isPending} onClick={onClose}>
          Annuler
        </Button>
        <Button variant="danger" block isLoading={isPending} onClick={onConfirm}>
          Transférer
        </Button>
      </div>
    </Dialog>
  )
}
