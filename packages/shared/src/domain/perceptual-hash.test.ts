import { describe, expect, it } from 'vitest'
import {
  findDuplicate,
  hasEnoughDetailForDedup,
  hammingDistance,
  isDuplicatePhoto,
  perceptualHash,
} from './perceptual-hash'

const image = (f: (x: number, y: number) => number) =>
  Uint8Array.from({ length: 1024 }, (_, i) =>
    Math.max(0, Math.min(255, Math.round(f(i % 32, Math.floor(i / 32))))),
  )
const diagonalFn = (x: number, y: number) =>
  120 +
  40 *
    (Math.sin(x / 3) * Math.cos(y / 4) +
      0.6 * Math.sin((x + 2 * y) / 5) +
      0.4 * Math.cos(Math.hypot(x - 10, y - 20) / 2))
const diagonal = image(diagonalFn)
const flat = (v: number) => image(() => v)
const gradient = image((x, y) => (x + y) * 4)
const rings = image((x, y) => 128 + 120 * Math.sin(Math.hypot(x - 16, y - 16) / 2))

describe('perceptual hash', () => {
  it('returns 16 hex chars', () => expect(perceptualHash(diagonal)).toMatch(/^[0-9a-f]{16}$/))
  it('ignores a uniform brightness shift', () =>
    expect(perceptualHash(image((x, y) => diagonalFn(x, y) + 3))).toBe(perceptualHash(diagonal)))
  it('stays close under light noise', () => {
    const noisy = image((x, y) => diagonalFn(x, y) + ((x * 7 + y * 13) % 5) - 2)
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
  it('flags distinct flat images as too flat to deduplicate', () => {
    expect(hasEnoughDetailForDedup(flat(128))).toBe(false)
    expect(hasEnoughDetailForDedup(flat(5))).toBe(false)
  })
  it('does not treat a flat image and a smooth gradient as duplicates', () =>
    expect(isDuplicatePhoto(perceptualHash(flat(128)), perceptualHash(gradient))).toBe(false))
  it('detects enough detail on textured images only', () => {
    expect(hasEnoughDetailForDedup(diagonal)).toBe(true)
    expect(hasEnoughDetailForDedup(rings)).toBe(true)
    expect(hasEnoughDetailForDedup(flat(128))).toBe(false)
    expect(hasEnoughDetailForDedup(image((x, y) => 128 + ((x * 7 + y * 13) % 3) - 1))).toBe(false)
  })
})
