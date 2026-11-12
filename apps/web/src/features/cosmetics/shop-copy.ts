import type { CosmeticItemId, CosmeticSlot } from '@storix/shared'

/** Hint under a theme in the catalogue. */
export const SLOT_ROW_HINT: Readonly<Record<CosmeticSlot, string>> = {
  booster: 'Standard + premium',
  cardBack: 'Pendant tes ouvertures',
  raritySet: 'Cadres · 6 raretés',
  avatarFrame: 'Vu par la ligue',
  revealAura: 'Avant chaque carte',
  banner: 'Vu par la ligue',
  nameStyle: 'Vu par la ligue',
  momentStamp: 'Sur tes Moments',
}

export const ORIGINAL_ROW_HINT = "Le style d'origine"

/** Name of a slot in Mon style. */
export const SLOT_TITLE: Readonly<Record<CosmeticSlot, string>> = {
  booster: 'Boosters',
  cardBack: 'Dos de carte',
  raritySet: 'Cadres de rareté',
  avatarFrame: "Cadre d'avatar",
  revealAura: 'Aura de révélation',
  banner: 'Bannière de classeur',
  nameStyle: 'Reflet du pseudo',
  momentStamp: 'Tampon du Moment',
}

const PURCHASE_NOUN: Readonly<Record<CosmeticSlot, string>> = {
  booster: 'le lot de boosters',
  cardBack: 'le dos',
  raritySet: 'les raretés',
  avatarFrame: 'le cadre',
  revealAura: "l'aura",
  banner: 'la bannière',
  nameStyle: 'le reflet',
  momentStamp: 'le tampon',
}

/** Question title of the purchase sheet, e.g. "Acheter les raretés Néon ?". */
export function purchaseQuestion(slot: CosmeticSlot, name: string): string {
  return `Acheter ${PURCHASE_NOUN[slot]} ${name} ?`
}

const THEME_ACCENT: Readonly<Record<CosmeticItemId, string>> = {
  'booster-neon': '#ff8be8',
  'booster-or-noir': '#e8cf8a',
  'booster-aquarelle': '#f9a8d4',
  'back-neon': '#ff8be8',
  'back-or-noir': '#e8cf8a',
  'back-aquarelle': '#f9a8d4',
  'rarity-neon': '#ff8be8',
  'rarity-gemmes': '#a5f3fc',
  'rarity-filet': '#d4d4e0',
  'frame-couronne': '#e8cf8a',
  'frame-arc-en-ciel': '#fbbf24',
  'frame-neon': '#ff8be8',
  'aura-petales': '#f9a8d4',
  'aura-etoiles': '#fde68a',
  'aura-flocons': '#bae6fd',
  'banner-constellation': '#c4b5fd',
  'banner-pellicule': '#e7e5e4',
  'banner-aurore': '#67e8f9',
  'name-or': '#fbbf24',
  'name-holo': '#f0abfc',
  'name-surligneur': '#a78bfa',
  'stamp-ticket': '#fef3c7',
  'stamp-polaroid': '#f9a8d4',
  'stamp-encre': '#fda4af',
}

const ORIGINAL_ACCENT = '#22d3ee'

/** Accent of a theme, used by the cabin's eyebrow and glow. */
export function themeAccent(itemId: CosmeticItemId | null): string {
  return itemId === null ? ORIGINAL_ACCENT : THEME_ACCENT[itemId]
}
