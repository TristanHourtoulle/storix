import { describe, expect, it } from 'vitest'
import { findDuplicate, hammingDistance, isDuplicatePhoto, perceptualHash } from './perceptual-hash'

const image = (f: (x: number, y: number) => number) =>
  Uint8Array.from({ length: 1024 }, (_, i) =>
    Math.max(0, Math.min(255, Math.round(f(i % 32, Math.floor(i / 32))))),
  )
const diagonal = image((x, y) => (x + y) * 4)
const rings = image((x, y) => 128 + 120 * Math.sin(Math.hypot(x - 16, y - 16) / 2))

describe('perceptual hash', () => {
  it('returns 16 hex chars', () => expect(perceptualHash(diagonal)).toMatch(/^[0-9a-f]{16}$/))
  it('ignores a uniform brightness shift', () =>
    expect(perceptualHash(image((x, y) => (x + y) * 4 + 3))).toBe(perceptualHash(diagonal)))
  it('stays close under light noise', () => {
    const noisy = image((x, y) => (x + y) * 4 + ((x * 7 + y * 13) % 5) - 2)
    expect(isDuplicatePhoto(perceptualHash(noisy), perceptualHash(diagonal))).toBe(true)
  })
  it('separates different images', () =>
    expect(isDuplicatePhoto(perceptualHash(rings), perceptualHash(diagonal))).toBe(false))
  it('measures hamming distance', () => {
    expect(hammingDistance('0000000000000000', '000000000000003f')).toBe(6)
    expect(hammingDistance('0000000000000000', 'ffffffffffffffff')).toBe(64)
  })
  it('throws on malformed hashes', () => expect(() => hammingDistance('zz', 'ff')).toThrow())
  it('uses an inclusive threshold of 6', () => {
    expect(isDuplicatePhoto('0000000000000000', '000000000000003f')).toBe(true)
    expect(isDuplicatePhoto('0000000000000000', '000000000000007f')).toBe(false)
  })
  it('finds the closest duplicate', () => {
    const existing = [
      { id: 'far', phash: '00000000000000ff' },
      { id: 'near', phash: '0000000000000001' },
    ]
    expect(findDuplicate('0000000000000000', existing)?.id).toBe('near')
    expect(findDuplicate('ffffffffffffffff', existing)).toBeNull()
  })
  it('rejects a wrong input size', () => expect(() => perceptualHash(new Uint8Array(10))).toThrow())
})
