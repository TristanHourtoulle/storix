import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { MemberSummary } from '@storix/shared'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { Button } from '@/components/ui/button'
import { MemberChip } from '@/components/ui/member-chip'
import { countOf } from '@/features/members/member-copy'
import { journalCountQueryOptions } from '../audit.queries'
import {
  DEFAULT_JOURNAL_FILTERS,
  JOURNAL_PERIODS,
  JOURNAL_PERIOD_LABELS,
  type JournalFilters,
} from '../journal-filters'

interface JournalFilterSheetProps {
  leagueId: string
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
  leagueId,
  value,
  members,
  onApply,
  onClose,
}: Omit<JournalFilterSheetProps, 'open'>) {
  const [draft, setDraft] = useState(value)
  const { data: count } = useQuery({
    ...journalCountQueryOptions(leagueId, draft),
    placeholderData: (previous) => previous,
  })

  return (
    <>
      <section className="flex flex-col gap-2">
        <h3 className="filter-label">Membre</h3>
        <div role="group" aria-label="Filtrer par membre" className="member-chip-row">
          <MemberChip
            label="Tous"
            isAll
            isOn={draft.memberId === null}
            onToggle={() => setDraft((prev) => ({ ...prev, memberId: null }))}
          />
          {members.map((member) => (
            <MemberChip
              key={member.userId}
              label={member.displayUsername}
              portrait={member.avatar}
              isOn={draft.memberId === member.userId}
              onToggle={() =>
                setDraft((prev) => ({
                  ...prev,
                  memberId: prev.memberId === member.userId ? null : member.userId,
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
          {count === undefined
            ? 'Voir le journal'
            : `Voir ${countOf(count.count, 'ligne', 'lignes')}`}
        </Button>
      </div>
    </>
  )
}
