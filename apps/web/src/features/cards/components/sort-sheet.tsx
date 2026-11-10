import type { CollectionSort } from '@storix/shared'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { SORT_OPTIONS } from '../collection-sort-labels'

interface SortSheetProps {
  open: boolean
  value: CollectionSort
  onPick: (sort: CollectionSort) => void
  onClose: () => void
}

export function SortSheet({ open, value, onPick, onClose }: SortSheetProps) {
  return (
    <BottomSheet open={open} title="Trier" onClose={onClose}>
      <div
        role="radiogroup"
        aria-label="Trier la collection"
        className="flex flex-col overflow-hidden rounded-control"
      >
        {SORT_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={option.id === value}
            className="sort-radio"
            onClick={() => {
              onPick(option.id)
              onClose()
            }}
          >
            <span aria-hidden="true" className="sort-radio-dot" />
            <span className="sort-radio-text">
              <b>{option.label}</b>
              <span>{option.hint}</span>
            </span>
          </button>
        ))}
      </div>
      <p className="m-0 text-sm text-faint">
        Les cartes à découvrir restent à la fin en tri Découverte.
      </p>
    </BottomSheet>
  )
}
