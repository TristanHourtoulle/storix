import { useState } from 'react'
import type { MemberSummary } from '@storix/shared'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { Button } from '@/components/ui/button'
import { Chip } from '@/components/ui/chip'
import { initials } from '@/lib/initials'
import {
  DEFAULT_JOURNAL_FILTERS,
  JOURNAL_PERIODS,
  JOURNAL_PERIOD_LABELS,
  type JournalFilters,
} from '../journal-filters'

interface JournalFilterSheetProps {
  open: boolean
  value: JournalFilters
  members: readonly MemberSummary[]
  onApply: (filters: JournalFilters) => void
  onClose: () => void
}

/** The Journal "⋯" sheet: member, period and the hidden-by-default economy actions. */
export function JournalFilterSheet({ open, ...rest }: JournalFilterSheetProps) {
  return (
    <BottomSheet open={open} title="Filtrer le journal" onClose={rest.onClose}>
      <JournalFilterForm {...rest} />
    </BottomSheet>
  )
}

function JournalFilterForm({
  value,
  members,
  onApply,
  onClose,
}: Omit<JournalFilterSheetProps, 'open'>) {
  const [draft, setDraft] = useState(value)

  return (
    <>
      <section className="flex flex-col gap-2">
        <h3 className="filter-label">Membre</h3>
        <div role="group" aria-label="Filtrer par membre" className="flex flex-wrap gap-2">
          <Chip
            label="Tous"
            isOn={draft.actorId === null}
            onToggle={() => setDraft((prev) => ({ ...prev, actorId: null }))}
          />
          {members.map((member) => (
            <Chip
              key={member.userId}
              label={member.displayUsername}
              initials={initials(member.displayUsername)}
              portrait={member.avatar}
              isOn={draft.actorId === member.userId}
              onToggle={() =>
                setDraft((prev) => ({
                  ...prev,
                  actorId: prev.actorId === member.userId ? null : member.userId,
                }))
              }
            />
          ))}
        </div>
      </section>
      <section className="flex flex-col gap-2">
        <h3 className="filter-label">Période</h3>
        <div className="filterrow" role="group" aria-label="Période">
          {JOURNAL_PERIODS.map((period) => (
            <button
              key={period}
              type="button"
              aria-pressed={draft.period === period}
              onClick={() => setDraft((prev) => ({ ...prev, period }))}
            >
              {JOURNAL_PERIOD_LABELS[period]}
            </button>
          ))}
        </div>
      </section>
      <button
        type="button"
        role="switch"
        aria-checked={draft.withEconomy}
        className="filter-switch"
        onClick={() => setDraft((prev) => ({ ...prev, withEconomy: !prev.withEconomy }))}
      >
        <span className="filter-switch-text">
          <b>Économie</b>
          <span>Recyclages, conversions, foils et améliorations des membres.</span>
        </span>
        <span aria-hidden="true" className="filter-switch-track" />
      </button>
      <div className="bsheet-footer">
        <Button
          variant="ghost"
          className="flex-1"
          onClick={() => setDraft({ ...DEFAULT_JOURNAL_FILTERS, chip: draft.chip })}
        >
          Réinitialiser
        </Button>
        <Button
          variant="primary"
          className="flex-1"
          onClick={() => {
            onApply(draft)
            onClose()
          }}
        >
          Voir le journal
        </Button>
      </div>
    </>
  )
}
