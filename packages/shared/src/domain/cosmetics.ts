import {
  COSMETIC_ITEMS,
  type CosmeticItem,
  type CosmeticItemId,
  type CosmeticSlot,
} from './cosmetic-catalog'
import { CARD_TIERS, type CardTier } from './cards'

export type PurchaseDecision = 'ok' | 'already_owned' | 'insufficient_dust'

export const TRY_ON_CARDS_MAX = 6

/** Returns the catalogue item with this id, or undefined when it does not exist. */
export function findCosmetic(id: string): CosmeticItem | undefined {
  return COSMETIC_ITEMS.find((item) => item.id === id)
}

/** Lists the items of a slot in display order. */
export function cosmeticsOfSlot(slot: CosmeticSlot): CosmeticItem[] {
  return COSMETIC_ITEMS.filter((item) => item.slot === slot).toSorted(
    (a, b) => a.sortOrder - b.sortOrder,
  )
}

/** Decides whether a member can buy an item with their current league balance. */
export function purchaseDecision(input: {
  item: CosmeticItem
  owned: readonly CosmeticItemId[]
  dust: number
}): PurchaseDecision {
  if (input.owned.includes(input.item.id)) return 'already_owned'
  if (input.dust < input.item.price) return 'insufficient_dust'
  return 'ok'
}

/** Tells whether an item (or the default, null) can be equipped in a slot. */
export function canEquip(input: {
  slot: CosmeticSlot
  itemId: CosmeticItemId | null
  owned: readonly CosmeticItemId[]
}): boolean {
  if (input.itemId === null) return true
  const item = findCosmetic(input.itemId)
  return item !== undefined && item.slot === input.slot && input.owned.includes(item.id)
}

/**
 * Picks the cards shown in the try-on cabin: one per tier from Commune up, then fills the remaining
 * slots in tier order. Keeps the input order within a tier and never repeats a card.
 */
export function pickTryOnCards<T extends { id: string; tier: CardTier }>(
  cards: readonly T[],
  max: number = TRY_ON_CARDS_MAX,
): T[] {
  const byTier = CARD_TIERS.map((tier) => cards.filter((card) => card.tier === tier))
  const firsts = byTier.flatMap((group) => group.slice(0, 1))
  const rest = byTier.flatMap((group) => group.slice(1))
  return [...firsts, ...rest].slice(0, Math.max(0, max))
}
