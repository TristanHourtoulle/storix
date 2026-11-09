import { CARD_TIERS, type CardTier } from './cards'

/** Position after which the next collection page starts, in rarest-first then newest-first order. */
export interface CollectionCursor {
  tier: CardTier
  number: number
}

const CURSOR_SEPARATOR = '.'

function isCardTier(value: string): value is CardTier {
  return (CARD_TIERS as readonly string[]).includes(value)
}

/** Encodes the last card of a collection page as an opaque `tier.number` cursor. */
export function encodeCollectionCursor(cursor: CollectionCursor): string {
  return `${cursor.tier}${CURSOR_SEPARATOR}${String(cursor.number)}`
}

/** Decodes a `tier.number` collection cursor, or returns null when it is malformed. */
export function parseCollectionCursor(raw: string): CollectionCursor | null {
  const parts = raw.split(CURSOR_SEPARATOR)
  if (parts.length !== 2) return null
  const [tier = '', digits = ''] = parts
  if (!isCardTier(tier) || !/^[1-9]\d{0,9}$/.test(digits)) return null
  const number = Number(digits)
  return Number.isSafeInteger(number) && number <= 2_147_483_647 ? { tier, number } : null
}
