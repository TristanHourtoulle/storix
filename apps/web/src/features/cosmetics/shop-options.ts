import {
  DEFAULT_THEME_NAME,
  cosmeticsOfSlot,
  type CosmeticItem,
  type CosmeticItemId,
  type CosmeticSlot,
  type MyCosmeticsResponse,
} from '@storix/shared'

export type OptionState = 'worn' | 'owned' | 'forSale' | 'unknown'

export interface ShopOption {
  itemId: CosmeticItemId | null
  slot: CosmeticSlot
  name: string
  item: CosmeticItem | null
}

/** Every theme of a slot in display order, starting with the free original style. */
export function slotOptions(slot: CosmeticSlot): ShopOption[] {
  const original: ShopOption = { itemId: null, slot, name: DEFAULT_THEME_NAME[slot], item: null }
  return [
    original,
    ...cosmeticsOfSlot(slot).map((item) => ({ itemId: item.id, slot, name: item.name, item })),
  ]
}

/** Whether the viewer wears an option, owns it, or can buy it; unknown until the viewer's cosmetics are loaded. */
export function optionState(
  option: ShopOption,
  mine: MyCosmeticsResponse | undefined,
): OptionState {
  if (mine === undefined) return 'unknown'
  if (mine.equipped[option.slot] === option.itemId) return 'worn'
  if (option.itemId === null || mine.owned.includes(option.itemId)) return 'owned'
  return 'forSale'
}

/** The options of a slot the viewer can wear: the original style and every owned item. */
export function wearableOptions(
  slot: CosmeticSlot,
  mine: MyCosmeticsResponse | undefined,
): ShopOption[] {
  return slotOptions(slot).filter(
    (option) => option.itemId === null || mine?.owned.includes(option.itemId) === true,
  )
}
