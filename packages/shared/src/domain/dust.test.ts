import { describe, expect, it } from 'vitest'
import { BOUND_TIERS, type CardTier } from './cards'
import {
  copyKey,
  craftCost,
  craftDecision,
  dustValue,
  foilUpgradeCost,
  foilUpgradeDecision,
  resolvePulledCopy,
  settleBoosterCopies,
} from './dust'

const target = (tierAtMint: CardTier, valueTier: CardTier = tierAtMint) => ({
  tierAtMint,
  valueTier,
})

describe('dust', () => {
  it('values copies from tier at mint, doubled for foil', () => {
    expect(dustValue('common', 'normal')).toBe(5)
    expect(dustValue('legendary', 'foil')).toBe(800)
    expect(dustValue('mythic', 'normal')).toBe(1000)
  })
  it('prices craft at 4x and refuses mythic', () => {
    expect(BOUND_TIERS.map(craftCost)).toEqual([20, 40, 100, 400, 1600])
    expect(craftCost('mythic')).toBeNull()
  })
  it('prices the foil upgrade at 2x', () => expect(foilUpgradeCost('rare')).toBe(50))
  it('resolves a pulled copy', () => {
    expect(resolvePulledCopy(null, { tierAtMint: 'rare', variant: 'normal' })).toEqual({
      outcome: 'new',
      stacked: null,
      dust: 0,
    })
    expect(resolvePulledCopy(target('rare'), { tierAtMint: 'common', variant: 'normal' })).toEqual({
      outcome: 'duplicate',
      stacked: { tierAtMint: 'common', variant: 'normal' },
      dust: 25,
    })
    expect(resolvePulledCopy(target('rare'), { tierAtMint: 'rare', variant: 'foil' })).toEqual({
      outcome: 'duplicate',
      stacked: { tierAtMint: 'rare', variant: 'foil' },
      dust: 50,
    })
    expect(resolvePulledCopy(target('common'), { tierAtMint: 'rare', variant: 'foil' })).toEqual({
      outcome: 'upgraded',
      stacked: { tierAtMint: 'common', variant: 'foil' },
      dust: 10,
    })
  })
  it('values a duplicate at the personal tier of a promoted copy', () => {
    const promoted = target('common', 'legendary')
    expect(resolvePulledCopy(promoted, { tierAtMint: 'common', variant: 'normal' }).dust).toBe(400)
    expect(resolvePulledCopy(target('epic'), { tierAtMint: 'mythic', variant: 'normal' })).toEqual({
      outcome: 'upgraded',
      stacked: { tierAtMint: 'epic', variant: 'normal' },
      dust: 100,
    })
    expect(
      resolvePulledCopy(target('mythic'), { tierAtMint: 'mythic', variant: 'normal' }).dust,
    ).toBe(1000)
  })
  it('settles a booster in order without mutating the owned map', () => {
    const owned = new Map([[copyKey('b', 'normal'), target('epic')]])
    const stackCounts = new Map<string, number>()
    const result = settleBoosterCopies(
      [
        { cardId: 'a', tier: 'common', variant: 'normal' },
        { cardId: 'a', tier: 'common', variant: 'normal' },
        { cardId: 'a', tier: 'common', variant: 'foil' },
        { cardId: 'b', tier: 'rare', variant: 'normal' },
      ],
      owned,
      stackCounts,
    )
    expect(
      result.settlements.map((s) => [s.outcome, s.stacked, s.stackCountAfter, s.isFirstCopyOfCard]),
    ).toEqual([
      ['new', null, null, true],
      ['duplicate', { tierAtMint: 'common', variant: 'normal' }, 1, false],
      ['new', null, null, false],
      ['duplicate', { tierAtMint: 'rare', variant: 'normal' }, 1, false],
    ])
    expect(owned.size).toBe(1)
    expect(stackCounts.size).toBe(0)
    expect(result.owned.get(copyKey('a', 'foil'))).toEqual(target('common'))
    expect(result.stackCounts.get('a')).toBe(1)
  })
  it('counts the stack after each pull, per card, across variants', () => {
    const { settlements } = settleBoosterCopies(
      [
        { cardId: 'a', tier: 'rare', variant: 'normal' },
        { cardId: 'a', tier: 'rare', variant: 'foil' },
      ],
      new Map([
        [copyKey('a', 'normal'), target('rare')],
        [copyKey('a', 'foil'), target('rare')],
      ]),
      new Map([['a', 3]]),
    )
    expect(settlements.map((s) => s.stackCountAfter)).toEqual([4, 5])
  })
  it('leaves the stack count null for a new copy', () => {
    const { settlements } = settleBoosterCopies(
      [{ cardId: 'a', tier: 'rare', variant: 'normal' }],
      new Map(),
      new Map([['a', 2]]),
    )
    expect(settlements.map((s) => [s.outcome, s.stacked, s.stackCountAfter])).toEqual([
      ['new', null, null],
    ])
  })
  it('stacks the displaced copy of an upgrade at its old tier', () => {
    const { settlements } = settleBoosterCopies(
      [{ cardId: 'a', tier: 'epic', variant: 'normal' }],
      new Map([[copyKey('a', 'normal'), target('common')]]),
      new Map(),
    )
    expect(settlements.map((s) => [s.outcome, s.stacked, s.stackCountAfter])).toEqual([
      ['upgraded', { tierAtMint: 'common', variant: 'normal' }, 1],
    ])
  })
  it('prices the foil upgrade on the value tier of the normal copy', () => {
    expect(
      foilUpgradeDecision({
        currentTier: 'rare',
        normalValueTier: 'epic',
        ownsFoil: false,
        dust: 200,
      }).cost,
    ).toBe(200)
  })
  it('stacks a pull at or below the value tier of a promoted copy', () => {
    const { settlements, owned } = settleBoosterCopies(
      [{ cardId: 'a', tier: 'legendary', variant: 'normal' }],
      new Map([[copyKey('a', 'normal'), target('common', 'mythic')]]),
      new Map(),
    )
    expect(settlements.map((s) => [s.outcome, s.stacked, s.stackCountAfter])).toEqual([
      ['duplicate', { tierAtMint: 'legendary', variant: 'normal' }, 1],
    ])
    expect(owned.get(copyKey('a', 'normal'))).toEqual(target('common', 'mythic'))
  })
  it('replaces a promoted copy pulled above its value tier, stacking the old copy at its value tier', () => {
    const { settlements, owned } = settleBoosterCopies(
      [{ cardId: 'a', tier: 'legendary', variant: 'foil' }],
      new Map([[copyKey('a', 'foil'), target('rare', 'epic')]]),
      new Map(),
    )
    expect(settlements.map((s) => [s.outcome, s.tierAtMint, s.stacked])).toEqual([
      ['upgraded', 'legendary', { tierAtMint: 'epic', variant: 'foil' }],
    ])
    expect(owned.get(copyKey('a', 'foil'))).toEqual(target('legendary'))
    const before = dustValue('epic', 'foil') + dustValue('legendary', 'foil')
    const after = dustValue('legendary', 'foil') + dustValue('epic', 'foil')
    expect([before, after]).toEqual([1000, 1000])
  })
  it('keeps comparing an unpromoted copy on its tier at mint', () => {
    expect(resolvePulledCopy(target('rare'), { tierAtMint: 'epic', variant: 'normal' })).toEqual({
      outcome: 'upgraded',
      stacked: { tierAtMint: 'rare', variant: 'normal' },
      dust: 25,
    })
    expect(resolvePulledCopy(target('rare'), { tierAtMint: 'rare', variant: 'normal' })).toEqual({
      outcome: 'duplicate',
      stacked: { tierAtMint: 'rare', variant: 'normal' },
      dust: 25,
    })
  })
  it('decides craft and foil upgrade', () => {
    const base = {
      currentTier: 'rare' as const,
      ownsAnyCopy: false,
      isBoosterEligible: true,
      dust: 100,
    }
    expect(craftDecision(base)).toEqual({ cost: 100, allowed: true, reason: null })
    expect(craftDecision({ ...base, ownsAnyCopy: true }).reason).toBe('owned')
    expect(craftDecision({ ...base, currentTier: 'mythic' })).toEqual({
      cost: null,
      allowed: false,
      reason: 'not_craftable',
    })
    expect(craftDecision({ ...base, isBoosterEligible: false }).reason).toBe('provisional')
    expect(craftDecision({ ...base, dust: 99 }).reason).toBe('insufficient_dust')
    const foil = {
      currentTier: 'epic' as const,
      normalValueTier: 'epic' as const,
      ownsFoil: false,
      dust: 200,
    }
    expect(foilUpgradeDecision(foil)).toEqual({ cost: 200, allowed: true, reason: null })
    expect(foilUpgradeDecision({ ...foil, normalValueTier: null })).toEqual({
      cost: 200,
      allowed: false,
      reason: 'no_normal',
    })
    expect(foilUpgradeDecision({ ...foil, ownsFoil: true }).reason).toBe('foil_owned')
    expect(foilUpgradeDecision({ ...foil, dust: 199 }).reason).toBe('insufficient_dust')
  })
  it('prices the foil upgrade on the normal copy tier at mint, like its recycle value', () => {
    const dropped = {
      currentTier: 'common' as const,
      normalValueTier: 'legendary' as const,
      ownsFoil: false,
      dust: 799,
    }
    expect(foilUpgradeDecision(dropped)).toEqual({
      cost: 800,
      allowed: false,
      reason: 'insufficient_dust',
    })
    expect(foilUpgradeDecision({ ...dropped, dust: 800 }).allowed).toBe(true)
    expect(
      foilUpgradeDecision({ ...dropped, currentTier: 'legendary', normalValueTier: 'common' }).cost,
    ).toBe(10)
  })
})
