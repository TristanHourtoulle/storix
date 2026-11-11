export const COSMETIC_SLOTS = [
  'booster',
  'cardBack',
  'raritySet',
  'avatarFrame',
  'revealAura',
] as const

export type CosmeticSlot = (typeof COSMETIC_SLOTS)[number]

export type CosmeticVisibility = 'self' | 'league'

export const COSMETIC_ITEM_IDS = [
  'booster-neon',
  'booster-or-noir',
  'booster-aquarelle',
  'back-neon',
  'back-or-noir',
  'back-aquarelle',
  'rarity-neon',
  'rarity-gemmes',
  'rarity-filet',
  'frame-couronne',
  'frame-arc-en-ciel',
  'frame-neon',
  'aura-petales',
  'aura-etoiles',
  'aura-flocons',
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
}

export const DEFAULT_THEME_NAME: Readonly<Record<CosmeticSlot, string>> = {
  booster: 'Nuit holo',
  cardBack: 'Nuit holo',
  raritySet: "D'origine",
  avatarFrame: "D'origine",
  revealAura: "D'origine",
}

function item(
  id: CosmeticItemId,
  slot: CosmeticSlot,
  name: string,
  sortOrder: number,
): CosmeticItem {
  return {
    id,
    slot,
    name,
    price: COSMETIC_PRICES[slot],
    visibility: slot === 'avatarFrame' ? 'league' : 'self',
    sortOrder,
  }
}

export const COSMETIC_ITEMS: readonly CosmeticItem[] = [
  item('booster-neon', 'booster', 'Néon', 1),
  item('booster-or-noir', 'booster', 'Or noir', 2),
  item('booster-aquarelle', 'booster', 'Aquarelle', 3),
  item('back-neon', 'cardBack', 'Néon', 1),
  item('back-or-noir', 'cardBack', 'Or noir', 2),
  item('back-aquarelle', 'cardBack', 'Aquarelle', 3),
  item('rarity-neon', 'raritySet', 'Néon', 1),
  item('rarity-gemmes', 'raritySet', 'Gemmes', 2),
  item('rarity-filet', 'raritySet', 'Filet', 3),
  item('frame-couronne', 'avatarFrame', "Couronne d'or", 1),
  item('frame-arc-en-ciel', 'avatarFrame', 'Arc-en-ciel', 2),
  item('frame-neon', 'avatarFrame', 'Néon', 3),
  item('aura-petales', 'revealAura', 'Pétales', 1),
  item('aura-etoiles', 'revealAura', 'Étoiles', 2),
  item('aura-flocons', 'revealAura', 'Flocons', 3),
]
