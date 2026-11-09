import type { CardTier } from './cards'
import { type PromotionDecision, type StackEntry, planStackTake, stackSize } from './promotion'

export interface ProgressionStep {
  to: CardTier
  cost: number
  copies: number
  copiesRequired: number
  missingCopies: number
}

export type CardProgression =
  | { kind: 'max'; stackCount: number; convertAllDust: number }
  | ({ kind: 'loading' } & ProgressionStep)
  | ({
      kind: 'missing'
      dust: number
      missingDust: number
      labelDust: number | null
    } & ProgressionStep)
  | ({ kind: 'ready'; dust: number } & ProgressionStep)

/** Derives the card progression shown in the bar and the upgrade sheet. */
export function cardProgression(input: {
  promotion: Pick<PromotionDecision, 'to' | 'cost' | 'copiesRequired' | 'copiesAvailable'>
  stack: readonly StackEntry[]
  dust: number | null
}): CardProgression {
  const { to, cost, copiesRequired, copiesAvailable } = input.promotion
  if (to === null || cost === null) {
    const stackCount = stackSize(input.stack)
    const convertAllDust = planStackTake(input.stack, stackCount, 'richest')?.dust ?? 0
    return { kind: 'max', stackCount, convertAllDust }
  }
  const step: ProgressionStep = {
    to,
    cost,
    copies: copiesAvailable,
    copiesRequired,
    missingCopies: Math.max(0, copiesRequired - copiesAvailable),
  }
  if (input.dust === null) return { kind: 'loading', ...step }
  const missingDust = Math.max(0, cost - input.dust)
  if (step.missingCopies === 0 && missingDust === 0) {
    return { kind: 'ready', ...step, dust: input.dust }
  }
  const labelDust = missingDust > 0 && step.missingCopies < copiesRequired ? missingDust : null
  return { kind: 'missing', ...step, dust: input.dust, missingDust, labelDust }
}
