import { describe, expect, it } from 'vitest'
import {
  drawBooster,
  EmptyBoosterPoolError,
  type PoolCard,
  rarePlusWeights,
  resolveTierWithFallback,
} from './booster-draw'
import type { CardTier } from './cards'
import { createSeededRandom, type RandomSource } from './random'

const SEED = '00000000000000000000000000000001'
const scripted = (values: number[]): RandomSource => {
  let i = 0
  return {
    nextInt: (max) => {
      const v = values[i++]
      if (v === undefined || v >= max) throw new Error('script')
      return v
    },
  }
}
const card = (cardId: string, tier: CardTier, authorId: string | null, n: number): PoolCard => ({
  cardId,
  tier,
  authorId,
  number: n,
})
const NO_PITY = { sinceEpic: 0, sinceLegendary: 0 }

describe('booster draw', () => {
  it('applies pity to the rare+ slot', () => {
    expect(rarePlusWeights(NO_PITY)).toEqual({ rare: 72, epic: 20, legendary: 7, mythic: 1 })
    expect(rarePlusWeights({ sinceEpic: 0, sinceLegendary: 30 })).toEqual({
      rare: 66,
      epic: 20,
      legendary: 13,
      mythic: 1,
    })
    expect(rarePlusWeights({ sinceEpic: 9, sinceLegendary: 0 })).toEqual({
      rare: 0,
      epic: 20,
      legendary: 7,
      mythic: 1,
    })
    expect(rarePlusWeights({ sinceEpic: 0, sinceLegendary: 104 })).toEqual({
      rare: 0,
      epic: 12,
      legendary: 87,
      mythic: 1,
    })
  })
  it('falls back down then up', () => {
    expect(resolveTierWithFallback('legendary', new Set(['common', 'epic']))).toBe('epic')
    expect(resolveTierWithFallback('uncommon', new Set(['rare']))).toBe('rare')
    expect(resolveTierWithFallback('common', new Set())).toBeNull()
  })
  it('draws five slots in the pinned RNG order', () => {
    const pool = [
      card('c1', 'common', 'a', 1),
      card('u1', 'uncommon', 'a', 2),
      card('r1', 'rare', 'b', 3),
      card('e1', 'epic', 'b', 4),
      card('l1', 'legendary', 'c', 5),
    ]
    const draws = drawBooster({
      pool,
      pity: NO_PITY,
      random: scripted([0, 0, 0, 1, 80, 0, 0, 1, 79, 0, 0, 1, 70, 0, 0, 1, 99, 0, 0, 0]),
    })
    expect(draws.map((d) => d.tier)).toEqual(['common', 'uncommon', 'common', 'rare', 'legendary'])
    expect(draws[4]).toMatchObject({ rolledTier: 'mythic', cardId: 'l1', variant: 'foil' })
    expect(draws.slice(0, 4).every((d) => d.variant === 'normal')).toBe(true)
  })
  it('honors the epic guarantee', () => {
    const pool = [
      card('c1', 'common', 'a', 1),
      card('r1', 'rare', 'a', 2),
      card('e1', 'epic', 'a', 3),
    ]
    const draws = drawBooster({
      pool,
      pity: { sinceEpic: 9, sinceLegendary: 0 },
      random: scripted([0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1]),
    })
    expect(draws[4]?.tier).toBe('epic')
  })
  it('picks the author first, then the card', () => {
    const pool = [
      card('a1', 'rare', 'a', 1),
      ...Array.from({ length: 9 }, (_, i) => card(`b${i}`, 'rare', 'b', 10 + i)),
    ]
    const random = createSeededRandom('0123456789abcdef0123456789abcdef')
    let fromA = 0
    let foils = 0
    for (let i = 0; i < 4000; i += 1) {
      for (const d of drawBooster({ pool, pity: NO_PITY, random })) {
        if (d.cardId === 'a1') fromA += 1
        if (d.variant === 'foil') foils += 1
      }
    }
    expect(fromA / 20_000).toBeGreaterThan(0.47)
    expect(fromA / 20_000).toBeLessThan(0.53)
    expect(foils / 20_000).toBeGreaterThan(1 / 15 - 0.01)
    expect(foils / 20_000).toBeLessThan(1 / 15 + 0.01)
  })
  it('rejects an empty pool and replays identically from a seed', () => {
    expect(() =>
      drawBooster({ pool: [], pity: NO_PITY, random: createSeededRandom(SEED) }),
    ).toThrow(EmptyBoosterPoolError)
    const pool = [card('c1', 'common', null, 1), card('r1', 'rare', 'x', 2)]
    const once = () => drawBooster({ pool, pity: NO_PITY, random: createSeededRandom(SEED) })
    expect(once()).toEqual(once())
  })
})
