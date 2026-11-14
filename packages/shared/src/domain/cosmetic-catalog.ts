export const COSMETIC_SLOTS = [
  'booster',
  'cardBack',
  'raritySet',
  'avatarFrame',
  'revealAura',
  'banner',
  'nameStyle',
  'momentStamp',
  'openingTear',
] as const

export type CosmeticSlot = (typeof COSMETIC_SLOTS)[number]

export type CosmeticVisibility = 'self' | 'league'

export const COSMETIC_ITEM_IDS = [
  'booster-neon',
  'booster-or-noir',
  'booster-aquarelle',
  'booster-cosmos',
  'booster-vitrail',
  'back-neon',
  'back-or-noir',
  'back-aquarelle',
  'back-cosmos',
  'back-vitrail',
  'rarity-neon',
  'rarity-gemmes',
  'rarity-filet',
  'rarity-vitrail',
  'frame-couronne',
  'frame-arc-en-ciel',
  'frame-neon',
  'aura-petales',
  'aura-etoiles',
  'aura-flocons',
  'banner-constellation',
  'banner-pellicule',
  'banner-aurore',
  'name-or',
  'name-holo',
  'name-surligneur',
  'stamp-ticket',
  'stamp-polaroid',
  'stamp-encre',
  'tear-braises',
  'tear-verre',
  'tear-ruban',
] as const

export type CosmeticItemId = (typeof COSMETIC_ITEM_IDS)[number]

export interface CosmeticItem {
  readonly id: CosmeticItemId
  readonly slot: CosmeticSlot
  readonly name: string
  readonly price: number
  readonly visibility: CosmeticVisibility
  readonly sortOrder: number
}

export const COSMETIC_PRICES: Readonly<Record<CosmeticSlot, number>> = {
  booster: 1500,
  cardBack: 600,
  raritySet: 2500,
  avatarFrame: 500,
  revealAura: 800,
  banner: 400,
  nameStyle: 900,
  momentStamp: 400,
  openingTear: 1200,
}

const LEAGUE_VISIBLE_SLOTS: ReadonlySet<CosmeticSlot> = new Set<CosmeticSlot>([
  'avatarFrame',
  'banner',
  'nameStyle',
  'momentStamp',
])

/** Whether the rest of the league sees what a member wears in this slot. */
export function isLeagueVisibleSlot(slot: CosmeticSlot): boolean {
  return LEAGUE_VISIBLE_SLOTS.has(slot)
}

export const DEFAULT_THEME_NAME: Readonly<Record<CosmeticSlot, string>> = {
  booster: 'Nuit holo',
  cardBack: 'Nuit holo',
  raritySet: "D'origine",
  avatarFrame: "D'origine",
  revealAura: "D'origine",
  banner: "D'origine",
  nameStyle: "D'origine",
  momentStamp: "D'origine",
  openingTear: "D'origine",
}

function item(
  id: CosmeticItemId,
  slot: CosmeticSlot,
  name: string,
  sortOrder: number,
  price: number = COSMETIC_PRICES[slot],
): CosmeticItem {
  return {
    id,
    slot,
    name,
    price,
    visibility: isLeagueVisibleSlot(slot) ? 'league' : 'self',
    sortOrder,
  }
}

export const COSMETIC_ITEMS: readonly CosmeticItem[] = [
  item('booster-neon', 'booster', 'Néon', 1),
  item('booster-or-noir', 'booster', 'Or noir', 2),
  item('booster-aquarelle', 'booster', 'Aquarelle', 3),
  item('booster-cosmos', 'booster', 'Cosmos', 4),
  item('booster-vitrail', 'booster', 'Vitrail', 5),
  item('back-neon', 'cardBack', 'Néon', 1),
  item('back-or-noir', 'cardBack', 'Or noir', 2),
  item('back-aquarelle', 'cardBack', 'Aquarelle', 3),
  item('back-cosmos', 'cardBack', 'Cosmos', 4),
  item('back-vitrail', 'cardBack', 'Vitrail', 5),
  item('rarity-neon', 'raritySet', 'Néon', 1),
  item('rarity-gemmes', 'raritySet', 'Gemmes', 2),
  item('rarity-filet', 'raritySet', 'Filet', 3),
  item('rarity-vitrail', 'raritySet', 'Vitrail', 4),
  item('frame-couronne', 'avatarFrame', "Couronne d'or", 1),
  item('frame-arc-en-ciel', 'avatarFrame', 'Arc-en-ciel', 2),
  item('frame-neon', 'avatarFrame', 'Néon', 3),
  item('aura-petales', 'revealAura', 'Pétales', 1),
  item('aura-etoiles', 'revealAura', 'Étoiles', 2),
  item('aura-flocons', 'revealAura', 'Flocons', 3),
  item('banner-constellation', 'banner', 'Constellation', 1),
  item('banner-pellicule', 'banner', 'Pellicule', 2, 500),
  item('banner-aurore', 'banner', 'Aurore', 3),
  item('name-or', 'nameStyle', 'Or', 1),
  item('name-holo', 'nameStyle', 'Holo', 2),
  item('name-surligneur', 'nameStyle', 'Surligneur', 3, 600),
  item('stamp-ticket', 'momentStamp', 'Ticket', 1),
  item('stamp-polaroid', 'momentStamp', 'Polaroid', 2),
  item('stamp-encre', 'momentStamp', 'Encre', 3),
  item('tear-braises', 'openingTear', 'Braises', 1),
  item('tear-verre', 'openingTear', 'Éclats de verre', 2),
  item('tear-ruban', 'openingTear', 'Ruban', 3),
]
