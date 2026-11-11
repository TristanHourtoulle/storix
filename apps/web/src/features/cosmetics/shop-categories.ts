import type { CosmeticSlot } from '@storix/shared'

export const SHOP_CATEGORY_SLUGS = ['boosters', 'dos', 'raretes', 'profil', 'ouverture'] as const

export type ShopCategorySlug = (typeof SHOP_CATEGORY_SLUGS)[number]

export interface ShopCategory {
  slug: ShopCategorySlug
  slot: CosmeticSlot
  chip: string
  eyebrow: string
}

export const SHOP_CATEGORIES: readonly ShopCategory[] = [
  { slug: 'boosters', slot: 'booster', chip: 'Boosters', eyebrow: 'Lot de boosters' },
  { slug: 'dos', slot: 'cardBack', chip: 'Dos', eyebrow: 'Dos de carte' },
  { slug: 'raretes', slot: 'raritySet', chip: 'Raretés', eyebrow: 'Cadres de rareté' },
  { slug: 'profil', slot: 'avatarFrame', chip: 'Profil', eyebrow: "Cadre d'avatar" },
  { slug: 'ouverture', slot: 'revealAura', chip: 'Ouverture', eyebrow: 'Aura de révélation' },
]

const DEFAULT_CATEGORY: ShopCategory = {
  slug: 'boosters',
  slot: 'booster',
  chip: 'Boosters',
  eyebrow: 'Lot de boosters',
}

/** The shop category with this slug, Boosters when it is unknown. */
export function shopCategory(slug: ShopCategorySlug): ShopCategory {
  return SHOP_CATEGORIES.find((category) => category.slug === slug) ?? DEFAULT_CATEGORY
}

/** The shop category selling the items of a slot. */
export function categoryOfSlot(slot: CosmeticSlot): ShopCategory {
  return SHOP_CATEGORIES.find((category) => category.slot === slot) ?? DEFAULT_CATEGORY
}
