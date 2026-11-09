import { describe, expect, it } from 'vitest'
import { CARD_TIERS, type CardTier } from './cards'
import type { CopyVariant } from './dust'
import {
  copyDustValue,
  nextTier,
  personalDisplayTier,
  planStackTake,
  promotionCost,
  promotionDecision,
  stackSize,
} from './promotion'

const copy = (
  variant: CopyVariant,
  tierAtMint: CardTier,
  promotedTier: CardTier | null = null,
) => ({
  variant,
  tierAtMint,
  promotedTier,
})
const entry = (variant: CopyVariant, tierAtMint: CardTier, count: number) => ({
  variant,
  tierAtMint,
  count,
})

describe('promotion costs and steps', () => {
  it('prices each step at 2x the target dust value', () => {
    expect(CARD_TIERS.slice(1).map(promotionCost)).toEqual([20, 50, 200, 800, 2000])
  })

  it('steps one tier and stops at mythic', () => {
    expect(nextTier('rare')).toBe('epic')
    expect(nextTier('legendary')).toBe('mythic')
    expect(nextTier('mythic')).toBeNull()
  })

  it('values a promoted copy at its personal tier, foil doubled', () => {
    expect(copyDustValue(copy('normal', 'rare', 'epic'))).toBe(100)
    expect(copyDustValue(copy('foil', 'rare', 'epic'))).toBe(200)
    expect(copyDustValue(copy('normal', 'rare'))).toBe(25)
  })
})

describe('personalDisplayTier', () => {
  it('keeps an unpromoted copy at its tier at mint', () => {
    expect(personalDisplayTier([copy('normal', 'common')], 'rare')).toBe('common')
  })

  it('never shows a promoted copy below the league tier', () => {
    expect(personalDisplayTier([copy('normal', 'common', 'rare')], 'legendary')).toBe('legendary')
  })

  it('freezes a promoted copy when the league tier drops', () => {
    expect(personalDisplayTier([copy('normal', 'common', 'epic')], 'common')).toBe('epic')
  })

  it('takes the best of both variants and falls back to the league tier', () => {
    expect(
      personalDisplayTier([copy('normal', 'legendary'), copy('foil', 'rare', 'epic')], 'rare'),
    ).toBe('legendary')
    expect(personalDisplayTier([], 'uncommon')).toBe('uncommon')
  })
})

describe('promotionDecision', () => {
  it('allows rare to epic with 10 copies and 200 dust, on the foil when owned', () => {
    const d = promotionDecision({
      copies: [copy('normal', 'rare'), copy('foil', 'rare')],
      leagueTier: 'rare',
      stack: [entry('normal', 'rare', 10)],
      dust: 200,
    })
    expect(d).toEqual({
      variant: 'foil',
      from: 'rare',
      to: 'epic',
      cost: 200,
      copiesRequired: 10,
      copiesAvailable: 10,
      allowed: true,
      reason: null,
    })
  })

  it('steps from the league tier when it is above the personal tier', () => {
    const d = promotionDecision({
      copies: [copy('normal', 'common')],
      leagueTier: 'rare',
      stack: [entry('normal', 'common', 10)],
      dust: 999,
    })
    expect([d.from, d.to, d.cost]).toEqual(['rare', 'epic', 200])
  })

  it('blocks mythic, missing copies, missing dust and no copy', () => {
    const base = { leagueTier: 'rare' as const, stack: [entry('normal', 'rare', 10)], dust: 10_000 }
    expect(promotionDecision({ ...base, copies: [copy('normal', 'rare', 'mythic')] }).reason).toBe(
      'max_tier',
    )
    expect(promotionDecision({ ...base, copies: [copy('normal', 'rare', 'mythic')] }).to).toBeNull()
    expect(
      promotionDecision({
        ...base,
        copies: [copy('normal', 'rare')],
        stack: [entry('foil', 'rare', 9)],
      }).reason,
    ).toBe('not_enough_copies')
    expect(promotionDecision({ ...base, copies: [copy('normal', 'rare')], dust: 199 }).reason).toBe(
      'insufficient_dust',
    )
    expect(promotionDecision({ ...base, copies: [] }).reason).toBe('not_owned')
  })
})

describe('planStackTake', () => {
  it('consumes the cheapest copies first, normal before foil at equal value', () => {
    const take = planStackTake(
      [entry('foil', 'common', 5), entry('normal', 'uncommon', 3), entry('normal', 'common', 4)],
      10,
      'cheapest',
    )
    expect(take?.taken).toEqual([
      entry('normal', 'common', 4),
      entry('foil', 'common', 5),
      entry('normal', 'uncommon', 1),
    ])
    expect(take?.remaining).toEqual([entry('normal', 'uncommon', 2)])
  })

  it('converts the richest copies of one variant first, with their dust', () => {
    const take = planStackTake(
      [entry('normal', 'common', 3), entry('normal', 'rare', 1), entry('foil', 'epic', 2)],
      2,
      'richest',
      'normal',
    )
    expect(take).toEqual({
      taken: [entry('normal', 'rare', 1), entry('normal', 'common', 1)],
      remaining: [entry('normal', 'common', 2), entry('foil', 'epic', 2)],
      dust: 30,
    })
  })

  it('returns null when the stack is too small and never mutates its input', () => {
    const entries = Object.freeze([Object.freeze(entry('normal', 'rare', 2))])
    expect(planStackTake(entries, 3, 'richest', 'normal')).toBeNull()
    expect(stackSize(entries)).toBe(2)
  })
})
