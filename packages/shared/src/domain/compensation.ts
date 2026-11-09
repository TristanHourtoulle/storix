import type { CardTier } from './cards'
import { dustValue, type CopyVariant } from './dust'
import { copyDustValue } from './promotion'

export interface RemovedCopy {
  ownerId: string
  cardId: string
  tierAtMint: CardTier
  variant: CopyVariant
  promotedTier: CardTier | null
}

export interface RemovedStack {
  ownerId: string
  cardId: string
  variant: CopyVariant
  tierAtMint: CardTier
  count: number
}

export interface OwnerCompensation {
  ownerId: string
  dust: number
  perCard: readonly { cardId: string; dust: number }[]
}

function byKey(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

/** Sums the dust owed to each owner for removed copies and stacked copies, owners and cards sorted ascending. */
export function compensateRemovedCopies(
  copies: readonly RemovedCopy[],
  stacks: readonly RemovedStack[] = [],
): OwnerCompensation[] {
  const credits = [
    ...copies.map((copy) => ({
      ownerId: copy.ownerId,
      cardId: copy.cardId,
      dust: copyDustValue(copy),
    })),
    ...stacks.map((stack) => ({
      ownerId: stack.ownerId,
      cardId: stack.cardId,
      dust: dustValue(stack.tierAtMint, stack.variant) * stack.count,
    })),
  ]
  const byOwner = new Map<string, Map<string, number>>()
  for (const credit of credits) {
    const cards = byOwner.get(credit.ownerId) ?? new Map<string, number>()
    cards.set(credit.cardId, (cards.get(credit.cardId) ?? 0) + credit.dust)
    byOwner.set(credit.ownerId, cards)
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
