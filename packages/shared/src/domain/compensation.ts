import type { CardTier } from './cards'
import { dustValue, type CopyVariant } from './dust'

export interface RemovedCopy {
  ownerId: string
  cardId: string
  tierAtMint: CardTier
  variant: CopyVariant
}

export interface OwnerCompensation {
  ownerId: string
  dust: number
  perCard: readonly { cardId: string; dust: number }[]
}

function byKey(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

/** Sums the dust owed to each owner for removed copies, owners and cards sorted ascending. */
export function compensateRemovedCopies(copies: readonly RemovedCopy[]): OwnerCompensation[] {
  const byOwner = new Map<string, Map<string, number>>()
  for (const copy of copies) {
    const cards = byOwner.get(copy.ownerId) ?? new Map<string, number>()
    cards.set(copy.cardId, (cards.get(copy.cardId) ?? 0) + dustValue(copy.tierAtMint, copy.variant))
    byOwner.set(copy.ownerId, cards)
  }
  return [...byOwner.entries()]
    .sort(([a], [b]) => byKey(a, b))
    .map(([ownerId, cards]) => {
      const perCard = [...cards.entries()]
        .sort(([a], [b]) => byKey(a, b))
        .map(([cardId, dust]) => ({ cardId, dust }))
      return { ownerId, dust: perCard.reduce((sum, entry) => sum + entry.dust, 0), perCard }
    })
}
