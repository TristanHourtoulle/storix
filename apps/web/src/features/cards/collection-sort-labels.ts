import type { CollectionSort, DiscoveryGroup } from '@storix/shared'

interface SortOption {
  id: CollectionSort
  label: string
  hint: string
  isNew?: boolean
}

export const SORT_OPTIONS: readonly SortOption[] = [
  { id: 'rarity', label: 'Rareté', hint: "Les plus rares d'abord" },
  { id: 'discovery', label: 'Découverte', hint: "Tes dernières cartes d'abord" },
  { id: 'number', label: 'Numéro', hint: "L'ordre d'arrivée dans la ligue" },
  { id: 'reactions', label: 'Plus aimées', hint: "Les plus réactées d'abord", isNew: true },
]

/** Returns the short French name of a collection sort. */
export function sortLabel(sort: CollectionSort): string {
  return SORT_OPTIONS.find((option) => option.id === sort)?.label ?? sort
}

export const DISCOVERY_GROUP_LABELS: Record<DiscoveryGroup, string> = {
  today: "Aujourd'hui",
  week: 'Cette semaine',
  month: 'Ce mois-ci',
  earlier: 'Plus tôt',
  undiscovered: 'À découvrir',
}
