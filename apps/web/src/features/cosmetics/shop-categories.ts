import { cosmeticsOfSlot, type CosmeticSlot } from '@storix/shared'

export const SHOP_CATEGORY_SLUGS = [
  'boosters',
  'dos',
  'raretes',
  'ouverture',
  'tampon',
  'profil',
  'banniere',
  'pseudo',
] as const

export type ShopCategorySlug = (typeof SHOP_CATEGORY_SLUGS)[number]

export const SHOP_FAMILY_SLUGS = ['cartes', 'profil', 'sons'] as const

export type ShopFamilySlug = (typeof SHOP_FAMILY_SLUGS)[number]

export interface ShopCategory {
  slug: ShopCategorySlug
  slot: CosmeticSlot
  chip: string
  eyebrow: string
}

export interface ShopFamily {
  slug: ShopFamilySlug
  label: string
  categories: readonly ShopCategory[]
}

const BOOSTERS: ShopCategory = {
  slug: 'boosters',
  slot: 'booster',
  chip: 'Boosters',
  eyebrow: 'Lot de boosters',
}

export const SHOP_CATEGORIES: readonly ShopCategory[] = [
  BOOSTERS,
  { slug: 'dos', slot: 'cardBack', chip: 'Dos', eyebrow: 'Dos de carte' },
  { slug: 'raretes', slot: 'raritySet', chip: 'Raretés', eyebrow: 'Cadres de rareté' },
  { slug: 'ouverture', slot: 'revealAura', chip: 'Aura', eyebrow: 'Aura de révélation' },
  { slug: 'tampon', slot: 'momentStamp', chip: 'Tampon', eyebrow: 'Tampon du Moment' },
  { slug: 'profil', slot: 'avatarFrame', chip: 'Cadre', eyebrow: "Cadre d'avatar" },
  { slug: 'banniere', slot: 'banner', chip: 'Bannière', eyebrow: 'Bannière de classeur' },
  { slug: 'pseudo', slot: 'nameStyle', chip: 'Pseudo', eyebrow: 'Reflet du pseudo' },
]

const FAMILY_OF_CATEGORY: Readonly<Record<ShopCategorySlug, ShopFamilySlug>> = {
  boosters: 'cartes',
  dos: 'cartes',
  raretes: 'cartes',
  ouverture: 'cartes',
  tampon: 'cartes',
  profil: 'profil',
  banniere: 'profil',
  pseudo: 'profil',
}

const FAMILY_LABEL: Readonly<Record<ShopFamilySlug, string>> = {
  cartes: 'Cartes',
  profil: 'Profil',
  sons: 'Sons & partage',
}

export const SHOP_FAMILIES: readonly ShopFamily[] = SHOP_FAMILY_SLUGS.map((slug) => ({
  slug,
  label: FAMILY_LABEL[slug],
  categories: SHOP_CATEGORIES.filter((category) => FAMILY_OF_CATEGORY[category.slug] === slug),
}))

/** The shop category with this slug, Boosters when it is unknown. */
export function shopCategory(slug: ShopCategorySlug): ShopCategory {
  return SHOP_CATEGORIES.find((category) => category.slug === slug) ?? BOOSTERS
}

/** The shop category selling the items of a slot. */
export function categoryOfSlot(slot: CosmeticSlot): ShopCategory {
  return SHOP_CATEGORIES.find((category) => category.slot === slot) ?? BOOSTERS
}

/** The family a category is shelved in. */
export function familyOfCategory(slug: ShopCategorySlug): ShopFamilySlug {
  return FAMILY_OF_CATEGORY[slug]
}

/** The family with this slug. */
export function shopFamily(slug: ShopFamilySlug): ShopFamily {
  return SHOP_FAMILIES.find((family) => family.slug === slug) ?? { slug, label: '', categories: [] }
}

/** How many themes are on sale in a category, the free original style aside. */
export function categoryItemCount(category: ShopCategory): number {
  return cosmeticsOfSlot(category.slot).length
}

/** Order of a category across the whole shop, used to slide the content in the direction of travel. */
export function categoryOrder(slug: ShopCategorySlug | null): number {
  return slug === null ? SHOP_CATEGORIES.length : SHOP_CATEGORIES.findIndex((c) => c.slug === slug)
}
