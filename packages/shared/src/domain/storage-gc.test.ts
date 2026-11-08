import { describe, expect, it } from 'vitest'
import {
  classifyOrphans,
  evaluateGcSafety,
  filterDeletableKeys,
  mediaPrefixOfKey,
} from './storage-gc'

const L = '0b6f7c1e-3a59-4c1e-9d7e-2f1a6c3b4d5e'
const sha = (c: string) => c.repeat(64)
const old = new Date('2026-11-01T00:00:00Z')
const fresh = new Date('2026-11-06T23:00:00Z')
const gcNow = new Date('2026-11-07T00:00:00Z')
const SHA = sha('a')
const U = '3f2b8c1e-4a5d-4e6f-8a9b-0c1d2e3f4a5b'
const U1 = '1a2b3c4d-1111-4e6f-8a9b-0c1d2e3f4a5b'
const U2 = '1a2b3c4d-2222-4e6f-8a9b-0c1d2e3f4a5b'
const CROP = '0123456789abcdef'

describe('classifyOrphans', () => {
  it('deletes only old orphans under known prefixes', () => {
    const objects = [
      { key: `img/${L}/${sha('a')}/256.avif`, lastModified: old },
      { key: `img/${L}/${sha('b')}/256.avif`, lastModified: old },
      { key: `img/${L}/${sha('c')}/256.avif`, lastModified: fresh },
      { key: 'incoming/u1/x', lastModified: old },
      { key: 'incoming/u1/y', lastModified: old },
      { key: 'incoming/u1/z', lastModified: new Date('2026-11-05T12:00:00Z') },
      { key: 'other/file', lastModified: old },
    ]
    expect(
      classifyOrphans({
        objects,
        liveMediaPrefixes: new Set([`img/${L}/${sha('a')}/`]),
        liveIncomingKeys: new Set(['incoming/u1/y']),
        now: gcNow,
      }),
    ).toEqual([`img/${L}/${sha('b')}/256.avif`, 'incoming/u1/x'])
  })

  it('returns nothing for an empty listing', () => {
    expect(
      classifyOrphans({
        objects: [],
        liveMediaPrefixes: new Set(),
        liveIncomingKeys: new Set(),
        now: gcNow,
      }),
    ).toEqual([])
  })
})

describe('evaluateGcSafety', () => {
  it('aborts when no media is live but images exist', () => {
    expect(
      evaluateGcSafety({
        liveMediaPrefixCount: 0,
        imagesScanned: 6,
        imageCandidates: 6,
      }),
    ).toEqual({ safe: false, reason: 'no-live-media' })
  })

  it('accepts an empty bucket with no live media', () => {
    expect(
      evaluateGcSafety({
        liveMediaPrefixCount: 0,
        imagesScanned: 0,
        imageCandidates: 0,
      }),
    ).toEqual({ safe: true })
  })

  it('aborts when candidates exceed both the ratio and the count', () => {
    expect(
      evaluateGcSafety({
        liveMediaPrefixCount: 5,
        imagesScanned: 100,
        imageCandidates: 26,
      }),
    ).toEqual({ safe: false, reason: 'too-many-orphans' })
  })

  it('accepts many candidates below the ratio', () => {
    expect(
      evaluateGcSafety({
        liveMediaPrefixCount: 5,
        imagesScanned: 1000,
        imageCandidates: 200,
      }),
    ).toEqual({ safe: true })
  })

  it('accepts a high ratio at the absolute count', () => {
    expect(
      evaluateGcSafety({
        liveMediaPrefixCount: 5,
        imagesScanned: 12,
        imageCandidates: 3,
      }),
    ).toEqual({ safe: true })
  })

  it('aborts on a small bucket where every image looks orphaned', () => {
    expect(
      evaluateGcSafety({
        liveMediaPrefixCount: 2,
        imagesScanned: 12,
        imageCandidates: 12,
      }),
    ).toEqual({ safe: false, reason: 'too-many-orphans' })
  })

  it('accepts exactly the ratio boundary', () => {
    expect(
      evaluateGcSafety({
        liveMediaPrefixCount: 5,
        imagesScanned: 100,
        imageCandidates: 25,
      }),
    ).toEqual({ safe: true })
  })

  it('aborts at 4 candidates with a high ratio', () => {
    expect(
      evaluateGcSafety({
        liveMediaPrefixCount: 5,
        imagesScanned: 12,
        imageCandidates: 4,
      }),
    ).toEqual({ safe: false, reason: 'too-many-orphans' })
  })

  it('accepts nothing scanned while media is live', () => {
    expect(
      evaluateGcSafety({
        liveMediaPrefixCount: 3,
        imagesScanned: 0,
        imageCandidates: 0,
      }),
    ).toEqual({ safe: true })
  })
})

describe('portrait keys in storage rules', () => {
  it('mediaPrefixOfKey keeps 4 segments for pic keys and 3 for img keys', () => {
    expect(mediaPrefixOfKey(`pic/league/${L}/${U}/512.webp`)).toBe(`pic/league/${L}/${U}/`)
    expect(mediaPrefixOfKey(`img/${L}/${SHA}/c${CROP}/256.avif`)).toBe(`img/${L}/${SHA}/`)
  })

  it('classifyOrphans treats pic like img: 24 h grace, live prefix protected', () => {
    const objects = [
      { key: `pic/avatar/u1/${U1}/512.webp`, lastModified: old },
      { key: `pic/avatar/u1/${U2}/512.webp`, lastModified: old },
      { key: `pic/avatar/u1/${U2}/128.webp`, lastModified: old },
      { key: `pic/league/${L}/${U}/512.webp`, lastModified: fresh },
    ]
    expect(
      classifyOrphans({
        objects,
        liveMediaPrefixes: new Set([`pic/avatar/u1/${U1}/`]),
        liveIncomingKeys: new Set(),
        now: gcNow,
      }),
    ).toEqual([`pic/avatar/u1/${U2}/128.webp`, `pic/avatar/u1/${U2}/512.webp`])
  })

  it('filterDeletableKeys refuses live img/pic prefixes, live incoming keys and unknown prefixes', () => {
    const result = filterDeletableKeys({
      keys: [
        `pic/avatar/u1/${U1}/512.webp`,
        `pic/avatar/u1/${U2}/512.webp`,
        `img/${L}/${SHA}/256.webp`,
        'incoming/u1/x',
        'other/x',
      ],
      liveMediaPrefixes: new Set([`pic/avatar/u1/${U1}/`, `img/${L}/${SHA}/`]),
      liveIncomingKeys: new Set(['incoming/u1/x']),
    })
    expect(result).toEqual({
      deletable: [`pic/avatar/u1/${U2}/512.webp`],
      refused: [
        `pic/avatar/u1/${U1}/512.webp`,
        `img/${L}/${SHA}/256.webp`,
        'incoming/u1/x',
        'other/x',
      ],
    })
  })

  it('filterDeletableKeys keeps dead img and incoming keys in input order', () => {
    expect(
      filterDeletableKeys({
        keys: ['incoming/u1/y', `img/${L}/${sha('b')}/256.webp`],
        liveMediaPrefixes: new Set([`img/${L}/${SHA}/`]),
        liveIncomingKeys: new Set(['incoming/u1/x']),
      }),
    ).toEqual({ deletable: ['incoming/u1/y', `img/${L}/${sha('b')}/256.webp`], refused: [] })
  })
})
