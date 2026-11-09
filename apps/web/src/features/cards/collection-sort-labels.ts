import type { CollectionSort } from '@storix/shared'

interface SortOption {
  id: CollectionSort
  label: string
  hint: string
}

export const SORT_OPTIONS: readonly SortOption[] = [
  { id: 'rarity', label: 'Rareté', hint: "Les plus rares d'abord" },
  { id: 'discovery', label: 'Découverte', hint: "Tes dernières cartes d'abord" },
  { id: 'number', label: 'Numéro', hint: "L'ordre d'arrivée dans la ligue" },
]

/** Returns the short French name of a collection sort. */
export function sortLabel(sort: CollectionSort): string {
  return SORT_OPTIONS.find((option) => option.id === sort)?.label ?? sort
}
