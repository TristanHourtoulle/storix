import type { CollectionSort, MemberSummary } from '@storix/shared'
import { Icon } from '@/components/ui/icon'
import { activeFilterCount, type CollectionFilterState } from '../collection-filters'
import { sortLabel } from '../collection-sort-labels'
import { ActiveFilterTokens } from './active-filter-tokens'

interface CollectionToolbarProps {
  filters: CollectionFilterState
  members: readonly MemberSummary[]
  onOpenFilters: () => void
  onChangeFilters: (filters: CollectionFilterState) => void
  sort: CollectionSort
  onOpenSort: () => void
  newCount: number
  isNewFirst: boolean
  canReorderNew: boolean
  onToggleNewFirst: () => void
  onMarkAllSeen: () => void
}

export function CollectionToolbar({
  filters,
  members,
  onOpenFilters,
  onChangeFilters,
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
  const filterCount = activeFilterCount(filters)

  return (
    <div className="flex flex-col gap-2">
      <div className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 [scrollbar-width:none]">
        <button
          type="button"
          className="sort-btn"
          aria-haspopup="dialog"
          aria-label={
            filterCount > 0
              ? `Filtres, ${filterCount} actif${filterCount > 1 ? 's' : ''}`
              : 'Filtres'
          }
          onClick={onOpenFilters}
        >
          Filtres
          {filterCount > 0 ? <span className="filter-count">{filterCount}</span> : null}
        </button>
        <button
          type="button"
          className="sort-btn"
          aria-haspopup="dialog"
          aria-label={`Trier la collection, ordre actuel : ${label}`}
          onClick={onOpenSort}
        >
          Trier · {label}
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
      {filterCount > 0 || hasNew ? (
        <div className="flex flex-wrap items-center gap-2">
          <ActiveFilterTokens filters={filters} members={members} onChange={onChangeFilters} />
          {hasNew ? (
            <button type="button" className="mark-all ml-auto" onClick={onMarkAllSeen}>
              Tout marquer comme vu
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
