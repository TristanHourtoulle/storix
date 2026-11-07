import { describe, expect, it } from 'vitest'
import {
  BoosterPoolTooSmallError,
  boosterPoolDigestInput,
  MIN_DRAWABLE_CARDS_FOR_BOOSTER,
  drawBooster,
  pickFromTier,
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
const ZERO_ROLLS = Array.from({ length: 5 }, () => [0, 0, 0, 1]).flat()
const commons = (count: number, authorId: string | null = 'a'): PoolCard[] =>
  Array.from({ length: count }, (_, i) => card(`c${i}`, 'common', authorId, i + 1))
const seedAt = (i: number): string => i.toString(16).padStart(32, '0')

describe('booster draw', () => {
  it('breaks number ties by card id', () => {
    const a = card('a', 'common', 'x', 1)
    const b = card('b', 'common', 'x', 1)
    expect(pickFromTier([b, a], scripted([0, 0]))).toBe(a)
    expect(pickFromTier([a, b], scripted([0, 1]))).toBe(b)
    expect(pickFromTier([b, a], scripted([0, 1]))).toBe(b)
  })
  it('builds a canonical pool digest input', () => {
    const pool = [
      card('b', 'rare', null, 2),
      card('a', 'common', 'x', 1),
      card('c', 'rare', 'y', 2),
    ]
    expect(boosterPoolDigestInput(pool)).toBe('1:common:x,2:rare:,2:rare:y')
    expect(boosterPoolDigestInput([...pool].reverse())).toBe(boosterPoolDigestInput(pool))
    expect(boosterPoolDigestInput([])).toBe('')
  })
  it('keeps the rare+ weights summing to 100 unless the Epic guarantee drops Rare', () => {
    const states = [
      { sinceEpic: 0, sinceLegendary: 0 },
      { sinceEpic: 0, sinceLegendary: 25 },
      { sinceEpic: 0, sinceLegendary: 60 },
      { sinceEpic: 3, sinceLegendary: 500 },
    ]
    for (const pity of states) {
      const total = Object.values(rarePlusWeights(pity)).reduce((sum, w) => sum + w, 0)
      expect(total).toBe(100)
    }
    const guaranteed = rarePlusWeights({ sinceEpic: 9, sinceLegendary: 0 })
    expect(Object.values(guaranteed).reduce((sum, w) => sum + w, 0)).toBe(28)
  })
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
  it('searches up to higher tiers before falling below the floor', () => {
    const available = new Set<CardTier>(['common', 'rare', 'legendary'])
    expect(resolveTierWithFallback('epic', available, 'epic')).toBe('legendary')
    expect(resolveTierWithFallback('epic', available)).toBe('rare')
    expect(resolveTierWithFallback('mythic', available, 'epic')).toBe('legendary')
    expect(resolveTierWithFallback('epic', new Set<CardTier>(['common', 'rare']), 'epic')).toBe(
      'rare',
    )
  })
  it('honors the epic guarantee with a higher tier when no epic exists', () => {
    const pool = [...commons(5), card('l1', 'legendary', 'a', 10)]
    const random = createSeededRandom(SEED)
    for (let i = 0; i < 200; i += 1) {
      const draws = drawBooster({ pool, pity: { sinceEpic: 9, sinceLegendary: 0 }, random })
      expect(draws[4]?.tier).toBe('legendary')
    }
  })
  it('replays version 1 openings without the epic floor', () => {
    const pool = [card('c1', 'common', 'a', 1), card('l1', 'legendary', 'a', 2)]
    const random = createSeededRandom(SEED)
    const tiers = Array.from(
      { length: 200 },
      () =>
        drawBooster({ pool, pity: { sinceEpic: 9, sinceLegendary: 0 }, random, tableVersion: 1 })[4]
          ?.tier,
    )
    expect(tiers).toContain('common')
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
      tableVersion: 2,
    })
    expect(draws.map((d) => d.tier)).toEqual(['common', 'uncommon', 'common', 'rare', 'legendary'])
    expect(draws[4]).toMatchObject({ rolledTier: 'mythic', cardId: 'l1', variant: 'foil' })
    expect(draws.slice(0, 4).every((d) => d.variant === 'normal')).toBe(true)
  })
  it('honors the epic guarantee', () => {
    const pool = [...commons(4), card('r1', 'rare', 'a', 5), card('e1', 'epic', 'a', 6)]
    const draws = drawBooster({
      pool,
      pity: { sinceEpic: 9, sinceLegendary: 0 },
      random: scripted(ZERO_ROLLS),
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
      const draws = drawBooster({ pool, pity: NO_PITY, random })
      if (draws[0]?.cardId === 'a1') fromA += 1
      foils += draws.filter((d) => d.variant === 'foil').length
    }
    expect(fromA / 4000).toBeGreaterThan(0.46)
    expect(fromA / 4000).toBeLessThan(0.54)
    expect(foils / 20_000).toBeGreaterThan(1 / 15 - 0.01)
    expect(foils / 20_000).toBeLessThan(1 / 15 + 0.01)
  })
  it('rejects an empty pool and replays identically from a seed', () => {
    expect(() =>
      drawBooster({ pool: [], pity: NO_PITY, random: createSeededRandom(SEED) }),
    ).toThrow(EmptyBoosterPoolError)
    const pool = [...commons(4, null), card('r1', 'rare', 'x', 5)]
    const once = () => drawBooster({ pool, pity: NO_PITY, random: createSeededRandom(SEED) })
    expect(once()).toEqual(once())
  })

  it('never draws the same card twice in a booster', () => {
    const pool = [
      ...commons(6),
      card('u1', 'uncommon', 'b', 20),
      card('u2', 'uncommon', 'c', 21),
      card('r1', 'rare', 'b', 30),
      card('e1', 'epic', 'c', 40),
    ]
    for (let i = 1; i <= 2000; i += 1) {
      const draws = drawBooster({ pool, pity: NO_PITY, random: createSeededRandom(seedAt(i)) })
      expect(new Set(draws.map((d) => d.cardId)).size).toBe(5)
    }
  })
  it('draws every card exactly once from a pool of exactly five', () => {
    const pool = [
      card('c1', 'common', 'a', 1),
      card('u1', 'uncommon', 'b', 2),
      card('r1', 'rare', 'a', 3),
      card('e1', 'epic', 'b', 4),
      card('l1', 'legendary', 'c', 5),
    ]
    expect(MIN_DRAWABLE_CARDS_FOR_BOOSTER).toBe(5)
    for (let i = 1; i <= 500; i += 1) {
      const draws = drawBooster({ pool, pity: NO_PITY, random: createSeededRandom(seedAt(i)) })
      expect(draws.map((d) => d.cardId).toSorted()).toEqual(['c1', 'e1', 'l1', 'r1', 'u1'])
    }
  })
  it('rejects a pool with fewer distinct cards than slots', () => {
    const random = createSeededRandom(SEED)
    expect(() => drawBooster({ pool: commons(4), pity: NO_PITY, random })).toThrow(
      BoosterPoolTooSmallError,
    )
    const duplicated = [...commons(4), card('c0', 'common', 'a', 1)]
    expect(() => drawBooster({ pool: duplicated, pity: NO_PITY, random })).toThrow(
      BoosterPoolTooSmallError,
    )
  })
  it('keeps the epic floor on the rare+ slot without duplicates', () => {
    const pool = [
      ...commons(5),
      card('u1', 'uncommon', 'b', 20),
      card('r1', 'rare', 'b', 30),
      card('e1', 'epic', 'c', 40),
    ]
    for (let i = 1; i <= 500; i += 1) {
      const draws = drawBooster({
        pool,
        pity: { sinceEpic: 9, sinceLegendary: 0 },
        random: createSeededRandom(seedAt(i)),
      })
      expect(draws[4]?.cardId).toBe('e1')
      expect(new Set(draws.map((d) => d.cardId)).size).toBe(5)
    }
  })
  it('falls back to the next tier when the rolled tier has no card left', () => {
    const pool = [
      card('c1', 'common', 'a', 1),
      card('u1', 'uncommon', 'a', 2),
      card('r1', 'rare', 'a', 3),
      card('r2', 'rare', 'a', 4),
      card('r3', 'rare', 'a', 5),
    ]
    const draws = drawBooster({ pool, pity: NO_PITY, random: scripted(ZERO_ROLLS) })
    expect(draws.map((d) => d.rolledTier)).toEqual([
      'common',
      'common',
      'common',
      'uncommon',
      'rare',
    ])
    expect(draws.map((d) => d.tier)).toEqual(['common', 'uncommon', 'rare', 'rare', 'rare'])
    expect(draws.map((d) => d.cardId)).toEqual(['c1', 'u1', 'r1', 'r2', 'r3'])
  })
  it('keeps replaying version 2 openings with replacement', () => {
    const pool = [card('c1', 'common', 'a', 1)]
    const draws = drawBooster({
      pool,
      pity: NO_PITY,
      random: createSeededRandom(SEED),
      tableVersion: 2,
    })
    expect(draws.map((d) => d.cardId)).toEqual(['c1', 'c1', 'c1', 'c1', 'c1'])
  })
})
