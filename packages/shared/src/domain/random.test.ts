import { describe, expect, it } from 'vitest'
import { createSeededRandom } from './random'

const SEED = '00000000000000000000000000000001'

describe('seeded random', () => {
  it('is deterministic per seed', () => {
    const a = createSeededRandom(SEED)
    const b = createSeededRandom(SEED)
    const seqA = Array.from({ length: 10 }, () => a.nextInt(100))
    expect(Array.from({ length: 10 }, () => b.nextInt(100))).toEqual(seqA)
    const c = createSeededRandom('00000000000000000000000000000002')
    expect(Array.from({ length: 10 }, () => c.nextInt(100))).not.toEqual(seqA)
  })
  it('validates seed and bound', () => {
    expect(() => createSeededRandom('zz')).toThrow()
    expect(() => createSeededRandom(SEED).nextInt(0)).toThrow()
    expect(() => createSeededRandom(SEED).nextInt(1.5)).toThrow()
    expect(createSeededRandom(SEED).nextInt(1)).toBe(0)
  })
  it('is roughly uniform', () => {
    const r = createSeededRandom('a3f1c2d4e5f60718293a4b5c6d7e8f90')
    const counts = Array.from({ length: 15 }, () => 0)
    for (let i = 0; i < 15_000; i += 1) {
      const bucket = r.nextInt(15)
      counts[bucket] = (counts[bucket] ?? 0) + 1
    }
    for (const count of counts) {
      expect(count).toBeGreaterThan(850)
      expect(count).toBeLessThan(1150)
    }
  })
})
