import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { plural } from '../upload-copy'

interface LeaveDialogProps {
  open: boolean
  sent: number
  unsent: number
  onKeep: () => Promise<void>
  onStay: () => void
  onDiscardAll: () => Promise<void>
}

function keptLine(sent: number): string {
  if (sent === 0) return "Aucune photo n'est encore envoyée."
  const photos = sent > 1 ? `${sent} photos envoyées restent` : '1 photo envoyée reste'
  return `${photos} en brouillon pendant 48 h, avec les titres déjà remplis. Personne d'autre ne les voit.`
}

function lostLine(unsent: number): string {
  return unsent > 1
    ? `${plural(unsent, 'photo', 'photos')} pas encore envoyées seront perdues.`
    : '1 photo pas encore envoyée sera perdue.'
}

/** "Quitter l'ajout ?" (R21). */
export function LeaveDialog({
  open,
  sent,
  unsent,
  onKeep,
  onStay,
  onDiscardAll,
}: LeaveDialogProps) {
  const [pending, setPending] = useState<'keep' | 'discard' | null>(null)

  const run =
    (kind: 'keep' | 'discard', action: () => Promise<void>) => async (): Promise<void> => {
      setPending(kind)
      try {
        await action()
      } finally {
        setPending(null)
      }
    }

  return (
    <Dialog open={open} title="Quitter l'ajout ?" isDismissible={pending === null} onClose={onStay}>
      <div className="flex flex-col gap-2 text-sm leading-snug text-muted">
        <p className="m-0">{keptLine(sent)}</p>
        {unsent > 0 ? <p className="m-0 font-semibold text-danger">{lostLine(unsent)}</p> : null}
      </div>
      <div className="flex flex-col gap-2">
        <Button
          variant="primary"
          block
          isLoading={pending === 'keep'}
          disabled={pending !== null}
          onClick={() => void run('keep', onKeep)()}
        >
          Garder le brouillon
        </Button>
        <Button variant="ghost" block disabled={pending !== null} onClick={onStay}>
          Continuer l&apos;ajout
        </Button>
        <Button
          variant="danger"
          block
          isLoading={pending === 'discard'}
          disabled={pending !== null}
          onClick={() => void run('discard', onDiscardAll)()}
        >
          Tout supprimer
        </Button>
      </div>
    </Dialog>
  )
}
