import { describe, expect, it } from 'vitest'
import { drawBooster, rarePlusWeights, type PoolCard } from './booster-draw'
import type { CardTier } from './cards'
import {
  CHARM_CATALOG,
  CHARM_WEEKLY_LIMIT,
  charmDust,
  charmPurchaseDecision,
  charmPurchasesInWeek,
  charmSlotWeights,
  findCharm,
  spendCharmCharge,
  type CharmId,
} from './charms'
import { createSeededRandom } from './random'

const NO_PITY = { sinceEpic: 0, sinceLegendary: 0 }
const seedAt = (i: number): string => i.toString(16).padStart(32, '0')
const card = (cardId: string, tier: CardTier, n: number, authorId = 'a'): PoolCard => ({
  cardId,
  tier,
  authorId,
  number: n,
})
const TIERS: readonly CardTier[] = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic']
const FULL_POOL: PoolCard[] = TIERS.flatMap((tier, t) =>
  Array.from({ length: 8 }, (_, i) => card(`${tier}-${i}`, tier, t * 10 + i + 1, `a${i % 3}`)),
)
const total = (weights: Partial<Record<CardTier, number>>): number =>
  Object.values(weights).reduce((sum, w) => sum + (w ?? 0), 0)

function lastSlotTiers(charm: CharmId | null, runs: number, isPremium = false): CardTier[] {
  return Array.from({ length: runs }, (_, i) => {
    const draws = drawBooster({
      pool: FULL_POOL,
      pity: NO_PITY,
      random: createSeededRandom(seedAt(i + 1)),
      isPremium,
      charm,
    })
    const last = draws.at(-1)
    if (last === undefined) throw new Error('empty draw')
    return last.tier
  })
}

const share = (tiers: readonly CardTier[], wanted: CardTier): number =>
  tiers.filter((tier) => tier === wanted).length / tiers.length

describe('charm slot weights', () => {
  it('turns Trèfle into +25 % Légendaire and Mythique taken from Rare', () => {
    expect(charmSlotWeights(rarePlusWeights(NO_PITY), 'trefle', 'standard')).toEqual({
      rare: 7000,
      epic: 2000,
      legendary: 875,
      mythic: 125,
    })
  })
  it("doubles Mythique with Trèfle d'or, standard and premium", () => {
    expect(charmSlotWeights(rarePlusWeights(NO_PITY), 'trefle-or', 'standard')).toEqual({
      rare: 6900,
      epic: 2000,
      legendary: 900,
      mythic: 200,
    })
    expect(charmSlotWeights({ legendary: 85, mythic: 15 }, 'trefle-or', 'premium')).toEqual({
      legendary: 7500,
      mythic: 2500,
    })
    expect(charmSlotWeights({ legendary: 85, mythic: 15 }, 'trefle', 'premium')).toEqual({
      legendary: 8125,
      mythic: 1875,
    })
  })
  it('takes from Épique when the Epic guarantee already emptied Rare, keeping the total', () => {
    const guaranteed = rarePlusWeights({ sinceEpic: 9, sinceLegendary: 0 })
    const charmed = charmSlotWeights(guaranteed, 'trefle', 'standard')
    expect(charmed?.rare).toBe(0)
    expect(charmed?.epic).toBe(1800)
    expect(total(charmed ?? {})).toBe(total(guaranteed) * 100)
  })
  it('leaves the slot alone for charms that do not change odds', () => {
    for (const id of ['boussole', 'aimant', 'eclat', 'tamis'] as const) {
      expect(charmSlotWeights(rarePlusWeights(NO_PITY), id, 'standard')).toBeNull()
    }
  })
})

describe('charmed booster draws', () => {
  it('draws exactly the same booster as before when no charm is active', () => {
    for (let i = 1; i <= 50; i += 1) {
      const base = { pool: FULL_POOL, pity: NO_PITY }
      const a = drawBooster({ ...base, random: createSeededRandom(seedAt(i)) })
      const b = drawBooster({ ...base, random: createSeededRandom(seedAt(i)), charm: null })
      expect(b).toEqual(a)
    }
  })
  it("shifts the last slot toward Légendaire and Mythique with Trèfle d'or", () => {
    const runs = 6000
    const plain = lastSlotTiers(null, runs)
    const lucky = lastSlotTiers('trefle-or', runs)
    expect(share(lucky, 'mythic')).toBeGreaterThan(share(plain, 'mythic') * 1.5)
    expect(share(lucky, 'legendary')).toBeGreaterThan(share(plain, 'legendary'))
    expect(share(lucky, 'mythic')).toBeLessThan(0.035)
  })
  it('flags a Trèfle pull only when the same roll would have given a lower tier', () => {
    const draws = (charm: CharmId | null) =>
      Array.from({ length: 3000 }, (_, i) =>
        drawBooster({
          pool: FULL_POOL,
          pity: NO_PITY,
          random: createSeededRandom(seedAt(i + 1)),
          charm,
        }),
      ).flat()
    expect(draws(null).some((draw) => draw.isLuckBoosted)).toBe(false)
    const boosted = draws('trefle-or').filter((draw) => draw.isLuckBoosted)
    expect(boosted.length).toBeGreaterThan(0)
    expect(boosted.every((draw) => draw.slot === 4)).toBe(true)
    expect(boosted.every((draw) => draw.tier === 'legendary' || draw.tier === 'mythic')).toBe(true)
  })
  it('raises foils with Éclat', () => {
    const foils = (charm: CharmId | null) =>
      Array.from({ length: 1500 }, (_, i) =>
        drawBooster({
          pool: FULL_POOL,
          pity: NO_PITY,
          random: createSeededRandom(seedAt(i + 1)),
          charm,
        }),
      )
        .flat()
        .filter((draw) => draw.variant === 'foil').length
    const plain = foils(null)
    const charmed = foils('eclat')
    expect(charmed / plain).toBeGreaterThan(1.1)
  })
  it('steers picks toward unowned cards with Boussole and owned cards with Aimant', () => {
    const owned = new Set(FULL_POOL.filter((_, i) => i % 2 === 0).map((c) => c.cardId))
    const ownedShare = (charm: CharmId | null) => {
      const draws = Array.from({ length: 1500 }, (_, i) =>
        drawBooster({
          pool: FULL_POOL,
          pity: NO_PITY,
          random: createSeededRandom(seedAt(i + 1)),
          charm,
          ownedCardIds: owned,
        }),
      ).flat()
      return draws.filter((draw) => owned.has(draw.cardId)).length / draws.length
    }
    const plain = ownedShare(null)
    expect(ownedShare('boussole')).toBeLessThan(plain - 0.05)
    expect(ownedShare('aimant')).toBeGreaterThan(plain + 0.05)
  })
  it('marks a pull as redirected only when the charm narrowed the choice', () => {
    const everythingNew = Array.from({ length: 200 }, (_, i) =>
      drawBooster({
        pool: FULL_POOL,
        pity: NO_PITY,
        random: createSeededRandom(seedAt(i + 1)),
        charm: 'boussole',
        ownedCardIds: new Set(),
      }),
    ).flat()
    expect(everythingNew.some((draw) => draw.isRedirected)).toBe(false)
    const someOwned = Array.from({ length: 200 }, (_, i) =>
      drawBooster({
        pool: FULL_POOL,
        pity: NO_PITY,
        random: createSeededRandom(seedAt(i + 1)),
        charm: 'aimant',
        ownedCardIds: new Set(['common-0', 'uncommon-0']),
      }),
    ).flat()
    const redirected = someOwned.filter((draw) => draw.isRedirected)
    expect(redirected.length).toBeGreaterThan(0)
    expect(redirected.every((draw) => ['common-0', 'uncommon-0'].includes(draw.cardId))).toBe(true)
  })
  it('falls back to Légendaire when the league has no Mythique yet', () => {
    const noMythic = FULL_POOL.filter((c) => c.tier !== 'mythic')
    const tiers = Array.from({ length: 400 }, (_, i) =>
      drawBooster({
        pool: noMythic,
        pity: NO_PITY,
        random: createSeededRandom(seedAt(i + 1)),
        charm: 'trefle-or',
        isPremium: true,
      }),
    ).map((draws) => draws.at(-1)?.tier)
    expect(tiers.every((tier) => tier === 'legendary')).toBe(true)
  })
})

describe('charm purchases and charges', () => {
  const trefle = findCharm('trefle')
  if (trefle === undefined) throw new Error('missing charm')
  const base = {
    charm: trefle,
    active: null,
    replaceCharm: null,
    purchasesThisWeek: 0,
    dust: 5000,
  }

  it('prices every charm at a week of earnings or more', () => {
    expect(CHARM_CATALOG.every((charm) => charm.price >= 1500)).toBe(true)
    expect(findCharm('trefle-or')?.price).toBeGreaterThanOrEqual(3000)
  })
  it('refuses the active charm, asks to replace another one, then applies the weekly cap', () => {
    expect(charmPurchaseDecision(base)).toBe('ok')
    expect(charmPurchaseDecision({ ...base, active: { id: 'trefle', charges: 4 } })).toBe(
      'already_active',
    )
    expect(charmPurchaseDecision({ ...base, active: { id: 'eclat', charges: 4 } })).toBe(
      'needs_replace',
    )
    expect(
      charmPurchaseDecision({
        ...base,
        active: { id: 'eclat', charges: 4 },
        replaceCharm: 'eclat',
      }),
    ).toBe('ok')
    expect(
      charmPurchaseDecision({
        ...base,
        active: { id: 'eclat', charges: 4 },
        replaceCharm: 'tamis',
      }),
    ).toBe('needs_replace')
    expect(charmPurchaseDecision({ ...base, replaceCharm: 'eclat' })).toBe('needs_replace')
    expect(charmPurchaseDecision({ ...base, purchasesThisWeek: CHARM_WEEKLY_LIMIT })).toBe(
      'weekly_limit',
    )
    expect(charmPurchaseDecision({ ...base, dust: trefle.price - 1 })).toBe('insufficient_dust')
  })
  it('spends one charge per booster and empties the slot on the last one', () => {
    expect(spendCharmCharge(null)).toBeNull()
    expect(spendCharmCharge({ id: 'tamis', charges: 10 })).toEqual({ id: 'tamis', charges: 9 })
    expect(spendCharmCharge({ id: 'tamis', charges: 1 })).toBeNull()
  })
  it('counts purchases over a rolling week', () => {
    const now = new Date('2026-11-14T12:00:00Z')
    const days = (n: number) => new Date(now.getTime() - n * 86_400_000)
    expect(charmPurchasesInWeek([days(1), days(6.9), days(7), days(10)], now)).toBe(2)
  })
  it('adds a quarter to duplicate dust with Tamis only', () => {
    expect(charmDust(100, 'tamis')).toBe(125)
    expect(charmDust(5, 'tamis')).toBe(6)
    expect(charmDust(100, 'trefle')).toBe(100)
    expect(charmDust(0, 'tamis')).toBe(0)
  })
})
