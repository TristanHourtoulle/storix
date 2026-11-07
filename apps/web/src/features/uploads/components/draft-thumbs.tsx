import type { ReactNode } from 'react'
import { Icon } from '@/components/ui/icon'
import type { DraftPhase, PhotoDraft } from '../use-photo-drafts'

interface DraftThumbsProps {
  drafts: readonly PhotoDraft[]
  selectedId: string | null
  onSelect: (id: string) => void
  addTile?: ReactNode
}

const BUSY_PHASES: ReadonlySet<DraftPhase> = new Set(['preparing', 'sending', 'processing'])

const PHASE_LABELS: Record<DraftPhase, string> = {
  preparing: 'préparation',
  ready: 'prête',
  sending: 'envoi en cours',
  processing: 'création en cours',
  created: 'carte créée',
  duplicate: 'doublon',
  error: 'erreur',
}

function PhaseOverlay({ draft }: { draft: PhotoDraft }) {
  if (BUSY_PHASES.has(draft.phase)) {
    return (
      <span className="absolute inset-0 grid place-items-center bg-bg/40">
        <span className="size-5 animate-spin rounded-full border-2 border-ink border-t-transparent" />
      </span>
    )
  }
  if (draft.phase === 'created') {
    return (
      <span className="absolute inset-0 grid place-items-center bg-bg/30">
        <span className="grid size-7 place-items-center rounded-full bg-tier-uncommon text-bg">
          <Icon name="check" className="size-4" />
        </span>
      </span>
    )
  }
  const label =
    draft.phase === 'duplicate'
      ? 'Doublon'
      : draft.phase === 'error'
        ? 'Erreur'
        : draft.errorMessage
          ? 'En attente'
          : null
  if (!label) return null
  return (
    <span className="absolute inset-x-1 bottom-1 rounded-md bg-bg/80 px-1 py-0.5 text-center font-display text-[11px] font-semibold text-ink">
      {label}
    </span>
  )
}

export function DraftThumbs({ drafts, selectedId, onSelect, addTile }: DraftThumbsProps) {
  return (
    <div className="grid grid-cols-4 gap-1.5">
      {drafts.map((draft, index) => {
        const isSelected = draft.id === selectedId
        return (
          <button
            key={draft.id}
            type="button"
            aria-label={`Photo ${index + 1}, ${PHASE_LABELS[draft.phase]}`}
            aria-pressed={isSelected}
            onClick={() => onSelect(draft.id)}
            className={`relative aspect-square cursor-pointer appearance-none overflow-hidden rounded-thumb border-0 bg-surface p-0 ${isSelected ? 'shadow-[0_0_0_2px_var(--color-accent)]' : ''}`}
          >
            {draft.photo ? (
              <img
                src={draft.photo.previewUrl}
                alt=""
                className={`absolute inset-0 size-full object-cover ${isSelected ? 'opacity-70' : ''}`}
              />
            ) : null}
            <PhaseOverlay draft={draft} />
            {isSelected ? (
              <span className="absolute top-1.5 right-1.5 grid size-[22px] place-items-center rounded-full bg-accent font-display text-xs font-bold text-bg">
                {index + 1}
              </span>
            ) : null}
          </button>
        )
      })}
      {addTile}
    </div>
  )
}
