import type { CosmeticItem, CosmeticSlot } from '@storix/shared'

const NUMBER_FORMAT = new Intl.NumberFormat('fr-FR')

/** Prefix naming what an item of each slot is, as in "Raretés Néon". */
export const SLOT_ITEM_PREFIX: Readonly<Record<CosmeticSlot, string>> = {
  booster: 'Boosters',
  cardBack: 'Dos',
  raritySet: 'Raretés',
  avatarFrame: 'Cadre',
  revealAura: 'Aura',
  banner: 'Bannière',
  nameStyle: 'Pseudo',
  momentStamp: 'Tampon',
}

/** Full name of an item with what it is, e.g. "Raretés Néon" or "Cadre Couronne d'or". */
export function cosmeticFullName(item: CosmeticItem): string {
  return `${SLOT_ITEM_PREFIX[item.slot]} ${item.name}`
}

/** A paillettes amount as shown on prices: "2 500 ✦". */
export function formatDustPrice(amount: number): string {
  return `${NUMBER_FORMAT.format(amount)} ✦`
}
