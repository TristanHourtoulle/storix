import { CARD_TIERS, type CardTier } from './cards'

export const COLLECTION_SORTS = ['rarity', 'discovery', 'number'] as const

export type CollectionSort = (typeof COLLECTION_SORTS)[number]

export const DEFAULT_COLLECTION_SORT: CollectionSort = 'rarity'

/**
 * Position after which the next collection page starts. Each sort has its own kinds: `rarity` for
 * rarest-first, `discovered` then `undiscovered` for newest discovery first, `number` for newest
 * number first. `discoveredAt` is epoch milliseconds.
 */
export type CollectionCursor =
  | { kind: 'rarity'; tier: CardTier; number: number }
  | { kind: 'discovered'; discoveredAt: number; tier: CardTier; number: number }
  | { kind: 'undiscovered'; number: number }
  | { kind: 'number'; number: number }

const CURSOR_SEPARATOR = '.'

const DISCOVERED_PREFIX = 'd'
const UNDISCOVERED_PREFIX = 'dl'
const NUMBER_PREFIX = 'n'

const MAX_CARD_NUMBER = 2_147_483_647

const MAX_EPOCH_MS = 8_640_000_000_000_000

/**
 * Stands for a numeric cursor sent by a client built before the rarest-first order. It ends the
 * collection with an empty last page; remove it once no such client remains.
 */
export const LEGACY_COLLECTION_CURSOR = 'legacy' as const

export type LegacyCollectionCursor = typeof LEGACY_COLLECTION_CURSOR

function isCardTier(value: string): value is CardTier {
  return (CARD_TIERS as readonly string[]).includes(value)
}

function parseCardNumber(digits: string): number | null {
  if (!/^[1-9]\d{0,9}$/.test(digits)) return null
  const number = Number(digits)
  return number <= MAX_CARD_NUMBER ? number : null
}

function parseEpochMs(digits: string): number | null {
  if (!/^(0|[1-9]\d{0,15})$/.test(digits)) return null
  const ms = Number(digits)
  return ms <= MAX_EPOCH_MS ? ms : null
}

/** Returns the sort a cursor belongs to. */
export function cursorSort(cursor: CollectionCursor): CollectionSort {
  switch (cursor.kind) {
    case 'rarity':
      return 'rarity'
    case 'discovered':
    case 'undiscovered':
      return 'discovery'
    case 'number':
      return 'number'
  }
}

/** Encodes the last card of a collection page as an opaque `tier.n`, `d.<ms>.<tier>.<n>`, `dl.<n>` or `n.<n>` cursor. */
export function encodeCollectionCursor(cursor: CollectionCursor): string {
  const parts = ((): readonly (string | number)[] => {
    switch (cursor.kind) {
      case 'rarity':
        return [cursor.tier, cursor.number]
      case 'discovered':
        return [DISCOVERED_PREFIX, cursor.discoveredAt, cursor.tier, cursor.number]
      case 'undiscovered':
        return [UNDISCOVERED_PREFIX, cursor.number]
      case 'number':
        return [NUMBER_PREFIX, cursor.number]
    }
  })()
  return parts.map(String).join(CURSOR_SEPARATOR)
}

function parseDiscovered(parts: readonly string[]): CollectionCursor | null {
  const [, msDigits = '', tier = '', numberDigits = ''] = parts
  const discoveredAt = parseEpochMs(msDigits)
  const number = parseCardNumber(numberDigits)
  if (discoveredAt === null || number === null || !isCardTier(tier)) return null
  return { kind: 'discovered', discoveredAt, tier, number }
}

function parseRarity(parts: readonly string[]): CollectionCursor | null {
  const [tier = '', digits = ''] = parts
  const number = parseCardNumber(digits)
  if (number === null || !isCardTier(tier)) return null
  return { kind: 'rarity', tier, number }
}

/** Decodes a collection cursor of any kind, or returns null when it is malformed. */
export function parseCollectionCursor(raw: string): CollectionCursor | null {
  const parts = raw.split(CURSOR_SEPARATOR)
  const [head = '', second = ''] = parts
  if (head === DISCOVERED_PREFIX) return parts.length === 4 ? parseDiscovered(parts) : null
  if (parts.length !== 2) return null
  if (head === UNDISCOVERED_PREFIX) {
    const number = parseCardNumber(second)
    return number === null ? null : { kind: 'undiscovered', number }
  }
  if (head === NUMBER_PREFIX) {
    const number = parseCardNumber(second)
    return number === null ? null : { kind: 'number', number }
  }
  return parseRarity(parts)
}
