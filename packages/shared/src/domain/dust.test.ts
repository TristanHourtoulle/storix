import { describe, expect, it } from 'vitest'
import { COMPUTED_TIERS } from './cards'
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

describe('dust', () => {
  it('values copies from tier at mint, doubled for foil', () => {
    expect(dustValue('common', 'normal')).toBe(5)
    expect(dustValue('legendary', 'foil')).toBe(800)
    expect(dustValue('mythic', 'normal')).toBe(1000)
  })
  it('prices craft at 4x and refuses mythic', () => {
    expect(COMPUTED_TIERS.map(craftCost)).toEqual([20, 40, 100, 400, 1600])
    expect(craftCost('mythic')).toBeNull()
  })
  it('prices the foil upgrade at 2x', () => expect(foilUpgradeCost('rare')).toBe(50))
  it('resolves a pulled copy', () => {
    expect(resolvePulledCopy(null, { tierAtMint: 'rare', variant: 'normal' })).toEqual({
      outcome: 'new',
      dust: 0,
    })
    expect(resolvePulledCopy('rare', { tierAtMint: 'common', variant: 'normal' })).toEqual({
      outcome: 'duplicate',
      dust: 5,
    })
    expect(resolvePulledCopy('rare', { tierAtMint: 'rare', variant: 'foil' })).toEqual({
      outcome: 'duplicate',
      dust: 50,
    })
    expect(resolvePulledCopy('common', { tierAtMint: 'rare', variant: 'foil' })).toEqual({
      outcome: 'upgraded',
      dust: 10,
    })
  })
  it('settles a booster in order without mutating the owned map', () => {
    const owned = new Map([[copyKey('b', 'normal'), 'epic' as const]])
    const result = settleBoosterCopies(
      [
        { cardId: 'a', tier: 'common', variant: 'normal' },
        { cardId: 'a', tier: 'common', variant: 'normal' },
        { cardId: 'a', tier: 'common', variant: 'foil' },
        { cardId: 'b', tier: 'rare', variant: 'normal' },
      ],
      owned,
    )
    expect(result.settlements.map((s) => [s.outcome, s.dust, s.isFirstCopyOfCard])).toEqual([
      ['new', 0, true],
      ['duplicate', 5, false],
      ['new', 0, false],
      ['duplicate', 25, false],
    ])
    expect(result.dustGained).toBe(30)
    expect(owned.size).toBe(1)
    expect(result.owned.get(copyKey('a', 'foil'))).toBe('common')
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
    const foil = { currentTier: 'epic' as const, ownsNormal: true, ownsFoil: false, dust: 200 }
    expect(foilUpgradeDecision(foil)).toEqual({ cost: 200, allowed: true, reason: null })
    expect(foilUpgradeDecision({ ...foil, ownsNormal: false }).reason).toBe('no_normal')
    expect(foilUpgradeDecision({ ...foil, ownsFoil: true }).reason).toBe('foil_owned')
    expect(foilUpgradeDecision({ ...foil, dust: 199 }).reason).toBe('insufficient_dust')
  })
})
