import type { CosmeticItemId } from '@storix/shared'
import { RARITY_PALETTES, type RarityPalette, type RaritySetKey } from './rarity-palettes'

export type RevealAuraKind = 'petal' | 'star' | 'flake'

export type BannerKind = 'constellation' | 'pellicule' | 'aurore'

export type MomentStampKind = 'ticket' | 'polaroid' | 'encre'

export type TearKind = 'braises' | 'verre' | 'ruban'

type ItemId<Prefix extends string> = Extract<CosmeticItemId, `${Prefix}-${string}`>

const PACK_SKIN: Readonly<Record<ItemId<'booster'>, string>> = {
  'booster-neon': 'skin-neon',
  'booster-or-noir': 'skin-or-noir',
  'booster-aquarelle': 'skin-aquarelle',
  'booster-cosmos': 'skin-cosmos',
  'booster-vitrail': 'skin-vitrail',
}

const CARD_BACK: Readonly<Record<ItemId<'back'>, string>> = {
  'back-neon': 'back-neon',
  'back-or-noir': 'back-or-noir',
  'back-aquarelle': 'back-aquarelle',
  'back-cosmos': 'back-cosmos',
  'back-vitrail': 'back-vitrail',
}

const RARITY_SET: Readonly<Record<ItemId<'rarity'>, Exclude<RaritySetKey, 'default'>>> = {
  'rarity-neon': 'neon',
  'rarity-gemmes': 'gemmes',
  'rarity-filet': 'filet',
  'rarity-vitrail': 'vitrail',
}

const AVATAR_FRAME: Readonly<Record<ItemId<'frame'>, string>> = {
  'frame-couronne': 'af-couronne',
  'frame-arc-en-ciel': 'af-arc-en-ciel',
  'frame-neon': 'af-neon',
}

const REVEAL_AURA: Readonly<Record<ItemId<'aura'>, RevealAuraKind>> = {
  'aura-petales': 'petal',
  'aura-etoiles': 'star',
  'aura-flocons': 'flake',
}

const BANNER: Readonly<Record<ItemId<'banner'>, BannerKind>> = {
  'banner-constellation': 'constellation',
  'banner-pellicule': 'pellicule',
  'banner-aurore': 'aurore',
}

const NAME_STYLE: Readonly<Record<ItemId<'name'>, string>> = {
  'name-or': 'nm-or',
  'name-holo': 'nm-holo',
  'name-surligneur': 'nm-surligneur',
}

const MOMENT_STAMP: Readonly<Record<ItemId<'stamp'>, MomentStampKind>> = {
  'stamp-ticket': 'ticket',
  'stamp-polaroid': 'polaroid',
  'stamp-encre': 'encre',
}

const OPENING_TEAR: Readonly<Record<ItemId<'tear'>, TearKind>> = {
  'tear-braises': 'braises',
  'tear-verre': 'verre',
  'tear-ruban': 'ruban',
}

function lookup<K extends string, V>(map: Readonly<Record<K, V>>, id: string | null): V | null {
  if (id === null || !Object.hasOwn(map, id)) return null
  return map[id as K]
}

/** Class of the booster pack skin (`skin-*`), or an empty string for the original packs. */
export function packSkinClass(id: CosmeticItemId | null): string {
  return lookup(PACK_SKIN, id) ?? ''
}

/** Class of the card back skin (`back-*`), or an empty string for the original back. */
export function cardBackClass(id: CosmeticItemId | null): string {
  return lookup(CARD_BACK, id) ?? ''
}

/** Key of the rarity frame set, `default` for the original rings. */
export function raritySetKey(id: CosmeticItemId | null): RaritySetKey {
  return lookup(RARITY_SET, id) ?? 'default'
}

/** Class of the rarity frame set on card faces (`rs-*`), or an empty string for the original rings. */
export function raritySetClass(id: CosmeticItemId | null): string {
  const key = raritySetKey(id)
  return key === 'default' ? '' : `rs-${key}`
}

/** Palette of the rarity frame set, used by the share canvas and the arcade effects. */
export function raritySetPalette(id: CosmeticItemId | null): RarityPalette {
  return RARITY_PALETTES[raritySetKey(id)]
}

/** Class of an avatar frame (`af-*`), or null when the avatar has no frame. */
export function avatarFrameClass(id: CosmeticItemId | null): string | null {
  return lookup(AVATAR_FRAME, id)
}

/** Particle shape of the reveal aura, or null for the original dots. */
export function revealAuraKind(id: CosmeticItemId | null): RevealAuraKind | null {
  return lookup(REVEAL_AURA, id)
}

/** Kind of member banner, or null for the original header without banner. */
export function bannerKind(id: CosmeticItemId | null): BannerKind | null {
  return lookup(BANNER, id)
}

/** Class of the display name reflection (`nm-*`), or null for the plain name. */
export function nameStyleClass(id: CosmeticItemId | null): string | null {
  return lookup(NAME_STYLE, id)
}

/** Kind of Moment stamp, or null for the original Moment badge. */
export function momentStampKind(id: CosmeticItemId | null): MomentStampKind | null {
  return lookup(MOMENT_STAMP, id)
}

/** Kind of opening tear, or null for the original crack and shard burst. */
export function tearKind(id: CosmeticItemId | null): TearKind | null {
  return lookup(OPENING_TEAR, id)
}
