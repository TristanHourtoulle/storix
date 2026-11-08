import { Button } from '@/components/ui/button'
import { Notice } from '@/components/ui/notice'

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
        {`Elle disparaît de toutes les collections. Les ${copiesInLeague} exemplaires sont remboursés en paillettes. C'est irréversible.`}
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
