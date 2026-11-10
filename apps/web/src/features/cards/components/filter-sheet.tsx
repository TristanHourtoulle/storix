import type { MemberSummary } from '@storix/shared'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { NO_FILTERS, type CollectionFilterState } from '../collection-filters'
import { MemberFilter } from './member-filter'
import { RarityFilter } from './rarity-filter'

interface FilterSheetProps {
  open: boolean
  value: CollectionFilterState
  members: readonly MemberSummary[]
  onApply: (filters: CollectionFilterState) => void
  onClose: () => void
}

export function FilterSheet({ open, value, members, onApply, onClose }: FilterSheetProps) {
  return (
    <Dialog open={open} title="Filtres" onClose={onClose}>
      {open ? (
        <FilterSheetForm value={value} members={members} onApply={onApply} onClose={onClose} />
      ) : null}
    </Dialog>
  )
}

type FilterSheetFormProps = Omit<FilterSheetProps, 'open'>

function FilterSheetForm({ value, members, onApply, onClose }: FilterSheetFormProps) {
  const [draft, setDraft] = useState(value)

  return (
    <>
      {members.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h3 className="filter-label">Membre</h3>
          <MemberFilter
            members={members}
            selectedId={draft.authorId}
            onSelect={(authorId) => setDraft((prev) => ({ ...prev, authorId }))}
          />
        </section>
      ) : null}
      <section className="flex flex-col gap-2">
        <h3 className="filter-label">Rareté</h3>
        <RarityFilter
          selected={draft.tier}
          onSelect={(tier) => setDraft((prev) => ({ ...prev, tier }))}
        />
      </section>
      <button
        type="button"
        role="switch"
        aria-checked={draft.hideLocked}
        className="filter-switch"
        onClick={() => setDraft((prev) => ({ ...prev, hideLocked: !prev.hideLocked }))}
      >
        <span className="filter-switch-text">
          <b>Masquer les cartes à découvrir</b>
          <span>Ne montre que celles que tu as tirées.</span>
        </span>
        <span aria-hidden="true" className="filter-switch-track" />
      </button>
      <div className="flex gap-3">
        <Button variant="ghost" className="flex-1" onClick={() => setDraft(NO_FILTERS)}>
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
          Appliquer
        </Button>
      </div>
    </>
  )
}
