import { Button } from '@/components/ui/button'
import { Notice } from '@/components/ui/notice'

function refundCopy(copies: number): string {
  if (copies === 0) return ''
  if (copies === 1) return ' Son exemplaire est remboursé en paillettes.'
  return ` Les ${copies} exemplaires sont remboursés en paillettes.`
}

interface DeleteCardConfirmProps {
  copiesInLeague: number
  isPending: boolean
  errorMessage: string | null
  onCancel: () => void
  onConfirm: () => void
}

export function DeleteCardConfirm({
  copiesInLeague,
  isPending,
  errorMessage,
  onCancel,
  onConfirm,
}: DeleteCardConfirmProps) {
  return (
    <>
      <p className="m-0 text-sm text-ink-2">
        {`Elle disparaît de toutes les collections.${refundCopy(copiesInLeague)} C'est irréversible.`}
      </p>
      {errorMessage ? <Notice tone="error">{errorMessage}</Notice> : null}
      <div className="flex gap-2">
        <Button variant="ghost" className="flex-1" onClick={onCancel} disabled={isPending}>
          Annuler
        </Button>
        <Button
          variant="primary"
          sound="destructive"
          className="flex-1 !bg-danger"
          onClick={onConfirm}
          isLoading={isPending}
        >
          Supprimer
        </Button>
      </div>
    </>
  )
}
