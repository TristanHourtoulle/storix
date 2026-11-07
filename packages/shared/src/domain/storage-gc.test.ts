import { describe, expect, it } from 'vitest'
import { classifyOrphans, evaluateGcSafety } from './storage-gc'

const L = '0b6f7c1e-3a59-4c1e-9d7e-2f1a6c3b4d5e'
const sha = (c: string) => c.repeat(64)
const old = new Date('2026-11-01T00:00:00Z')
const fresh = new Date('2026-11-06T23:00:00Z')
const gcNow = new Date('2026-11-07T00:00:00Z')

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
