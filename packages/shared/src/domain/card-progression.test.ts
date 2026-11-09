import { describe, expect, it } from 'vitest'
import { cardProgression } from './card-progression'
import type { StackEntry } from './promotion'

const toEpic = { to: 'epic', cost: 200, copiesRequired: 10 } as const
const rare = (count: number): StackEntry => ({ variant: 'normal', tierAtMint: 'rare', count })

describe('cardProgression', () => {
  it('omits the dust part when no copy is stacked', () => {
    expect(
      cardProgression({ promotion: { ...toEpic, copiesAvailable: 0 }, stack: [], dust: 120 }),
    ).toEqual({
      kind: 'missing',
      to: 'epic',
      cost: 200,
      copies: 0,
      copiesRequired: 10,
      missingCopies: 10,
      dust: 120,
      missingDust: 80,
      labelDust: null,
    })
  })
  it('reports both missing parts with 4 copies and 35 dust', () => {
    const result = cardProgression({
      promotion: { ...toEpic, copiesAvailable: 4 },
      stack: [rare(4)],
      dust: 35,
    })
    expect(result).toMatchObject({
      kind: 'missing',
      missingCopies: 6,
      missingDust: 165,
      labelDust: 165,
    })
  })
  it('is ready at exactly 10 copies and the exact cost', () => {
    expect(
      cardProgression({
        promotion: { ...toEpic, copiesAvailable: 10 },
        stack: [rare(10)],
        dust: 200,
      }),
    ).toMatchObject({ kind: 'ready', copies: 10, dust: 200, missingCopies: 0 })
  })
  it('is ready with more copies than required', () => {
    const stack: StackEntry[] = [rare(9), { variant: 'normal', tierAtMint: 'uncommon', count: 3 }]
    expect(
      cardProgression({ promotion: { ...toEpic, copiesAvailable: 12 }, stack, dust: 340 }),
    ).toMatchObject({ kind: 'ready', copies: 12, missingCopies: 0 })
  })
  it('misses one dust at cost minus one', () => {
    expect(
      cardProgression({
        promotion: { ...toEpic, copiesAvailable: 10 },
        stack: [rare(10)],
        dust: 199,
      }),
    ).toMatchObject({ kind: 'missing', missingCopies: 0, missingDust: 1, labelDust: 1 })
  })
  it('is loading while the wallet is unknown', () => {
    expect(
      cardProgression({
        promotion: { ...toEpic, copiesAvailable: 4 },
        stack: [rare(4)],
        dust: null,
      }),
    ).toEqual({
      kind: 'loading',
      to: 'epic',
      cost: 200,
      copies: 4,
      copiesRequired: 10,
      missingCopies: 6,
    })
  })
  it('values the whole stack at max tier', () => {
    const stack: StackEntry[] = [
      { variant: 'normal', tierAtMint: 'legendary', count: 6 },
      { variant: 'foil', tierAtMint: 'legendary', count: 1 },
    ]
    expect(
      cardProgression({
        promotion: { to: null, cost: null, copiesRequired: 10, copiesAvailable: 7 },
        stack,
        dust: 900,
      }),
    ).toEqual({ kind: 'max', stackCount: 7, convertAllDust: 3200 })
  })
  it('handles an empty stack at max tier', () => {
    expect(
      cardProgression({
        promotion: { to: null, cost: null, copiesRequired: 10, copiesAvailable: 0 },
        stack: [],
        dust: null,
      }),
    ).toEqual({ kind: 'max', stackCount: 0, convertAllDust: 0 })
  })
})
