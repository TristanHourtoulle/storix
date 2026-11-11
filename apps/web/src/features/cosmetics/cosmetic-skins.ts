import type { CosmeticItemId } from '@storix/shared'
import { RARITY_PALETTES, type RarityPalette, type RaritySetKey } from './rarity-palettes'

export type RevealAuraKind = 'petal' | 'star' | 'flake'

type ItemId<Prefix extends string> = Extract<CosmeticItemId, `${Prefix}-${string}`>

const PACK_SKIN: Readonly<Record<ItemId<'booster'>, string>> = {
  'booster-neon': 'skin-neon',
  'booster-or-noir': 'skin-or-noir',
  'booster-aquarelle': 'skin-aquarelle',
}

const CARD_BACK: Readonly<Record<ItemId<'back'>, string>> = {
  'back-neon': 'back-neon',
  'back-or-noir': 'back-or-noir',
  'back-aquarelle': 'back-aquarelle',
}

const RARITY_SET: Readonly<Record<ItemId<'rarity'>, Exclude<RaritySetKey, 'default'>>> = {
  'rarity-neon': 'neon',
  'rarity-gemmes': 'gemmes',
  'rarity-filet': 'filet',
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
