import type { StackCardPhase } from '../session/session-reducer'

interface UploadStatusBadgeProps {
  phase: StackCardPhase
  progress: number
  isCompact?: boolean
}

const TONES: Record<StackCardPhase, string> = {
  preparing: 'bg-board/80 text-ink-2',
  queued: 'bg-board/80 text-ink-2',
  sending: 'bg-board/80 text-cyan',
  processing: 'bg-board/80 text-accent-hover',
  staged: 'bg-board/80 text-tier-uncommon',
  error: 'bg-danger/90 text-bg',
  duplicate: 'bg-tier-legendary/90 text-bg',
}

/** French label of an upload phase (R18). */
function uploadStatusLabel(phase: StackCardPhase, progress: number): string {
  switch (phase) {
    case 'preparing':
      return 'Préparation'
    case 'queued':
      return 'En file'
    case 'sending':
      return `Envoi ${Math.floor(progress * 100)} %`
    case 'processing':
      return 'Traitement'
    case 'staged':
      return 'Envoyée'
    case 'error':
      return 'Échec'
    case 'duplicate':
      return 'Doublon'
  }
}

export function UploadStatusBadge({ phase, progress, isCompact = false }: UploadStatusBadgeProps) {
  const isBusy = phase === 'sending' || phase === 'processing' || phase === 'preparing'
  return (
    <span
      className={`absolute z-[4] inline-flex items-center gap-1.5 rounded-full font-display font-semibold tabular-nums ${isCompact ? 'top-1.5 left-1.5 px-1.5 py-0.5 text-[10px]' : 'top-2.5 left-2.5 px-2.5 py-1 text-[11px]'} ${TONES[phase]}`}
    >
      <span
        aria-hidden="true"
        className={`size-1.5 rounded-full bg-current ${isBusy ? 'animate-pulse' : ''}`}
      />
      {uploadStatusLabel(phase, progress)}
    </span>
  )
}
