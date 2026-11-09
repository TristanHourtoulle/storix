import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { plural } from '../upload-copy'

interface ShotLeaveDialogProps {
  open: boolean
  count: number
  onStay: () => void
  onLeave: () => void
}

function lostLine(count: number): string {
  const shots = plural(count, 'photo prise', 'photos prises')
  return count > 1
    ? `${shots} ici ne sont pas encore envoyées et seront perdues.`
    : `${shots} ici n'est pas encore envoyée et sera perdue.`
}

/** "Abandonner tes prises ?" (C12). */
export function ShotLeaveDialog({ open, count, onStay, onLeave }: ShotLeaveDialogProps) {
  return (
    <Dialog open={open} title="Abandonner tes prises ?" onClose={onStay}>
      <p className="m-0 text-sm leading-snug text-muted">{lostLine(count)}</p>
      <div className="flex flex-col gap-2">
        <Button variant="danger" block onClick={onLeave}>
          Abandonner
        </Button>
        <Button variant="ghost" block onClick={onStay}>
          Rester
        </Button>
      </div>
    </Dialog>
  )
}
