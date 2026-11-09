import type { CollectionSort } from '@storix/shared'
import { Icon } from '@/components/ui/icon'
import { sortLabel } from '../collection-sort-labels'

interface CollectionToolbarProps {
  sort: CollectionSort
  onOpenSort: () => void
  newCount: number
  isNewFirst: boolean
  canReorderNew: boolean
  onToggleNewFirst: () => void
  onMarkAllSeen: () => void
}

export function CollectionToolbar({
  sort,
  onOpenSort,
  newCount,
  isNewFirst,
  canReorderNew,
  onToggleNewFirst,
  onMarkAllSeen,
}: CollectionToolbarProps) {
  const label = sortLabel(sort)
  const hasNew = newCount > 0
  const newLabel = `✦ ${newCount} ${newCount > 1 ? 'nouvelles' : 'nouvelle'}`

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          className="sort-btn"
          aria-haspopup="dialog"
          aria-label={`Trier la collection, ordre actuel : ${label}`}
          onClick={onOpenSort}
        >
          <span>Trier :</span> {label}
          <Icon name="chevron-down" className="size-[15px]" />
        </button>
        {hasNew && canReorderNew ? (
          <button
            type="button"
            className="chip-new"
            aria-pressed={isNewFirst}
            onClick={onToggleNewFirst}
          >
            {newLabel}
          </button>
        ) : null}
        {hasNew && !canReorderNew ? <span className="chip-new">{newLabel}</span> : null}
      </div>
      {hasNew ? (
        <button type="button" className="mark-all" onClick={onMarkAllSeen}>
          Tout marquer comme vu
        </button>
      ) : null}
    </div>
  )
}
