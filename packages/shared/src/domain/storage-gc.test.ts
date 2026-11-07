import { describe, expect, it } from 'vitest'
import { classifyOrphans } from './storage-gc'

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
