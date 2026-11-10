import type { CardTier, MemberSummary } from '@storix/shared'
import { TIER_LABELS } from './tier-labels'

export interface CollectionFilterState {
  authorId: string | null
  tier: CardTier | null
  hideLocked: boolean
  upgradable: boolean
}

export const NO_FILTERS: CollectionFilterState = {
  authorId: null,
  tier: null,
  hideLocked: false,
  upgradable: false,
}

/** Counts the filters that narrow the collection. */
export function activeFilterCount({
  authorId,
  tier,
  hideLocked,
  upgradable,
}: CollectionFilterState): number {
  return [authorId !== null, tier !== null, hideLocked, upgradable].filter(Boolean).length
}

/** Builds the collection heading from the member and rarity filters, e.g. "Cartes de Léa · Rare". */
export function collectionLabel(
  { authorId, tier }: CollectionFilterState,
  members: readonly MemberSummary[],
): string {
  const authorName = members.find((member) => member.userId === authorId)?.displayUsername
  const base = authorName ? `Cartes de ${authorName}` : 'Toutes les cartes'
  return tier ? `${base} · ${TIER_LABELS[tier]}` : base
}
