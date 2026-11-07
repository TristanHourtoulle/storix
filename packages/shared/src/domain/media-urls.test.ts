import { describe, expect, it } from 'vitest'
import {
  buildMediaPath,
  isMediaWindowAccepted,
  mediaCacheKey,
  mediaMaxAgeSeconds,
  mediaVariantKey,
  mediaWindowStart,
  parseMediaPath,
} from './media-urls'

const now = new Date('2026-11-07T10:00:00Z')
const key = 'img/0b7c2f4e-1a2b-4c3d-8e9f-0123456789ab/' + 'a'.repeat(64) + '/768.avif'
const sig = 'f'.repeat(64)

describe('media urls', () => {
  it('starts windows at UTC midnight', () => expect(mediaWindowStart(now)).toBe(1794009600))
  it('accepts the current and previous window only', () => {
    expect(isMediaWindowAccepted(1794009600, now)).toBe(true)
    expect(isMediaWindowAccepted(1793923200, now)).toBe(true)
    expect(isMediaWindowAccepted(1793836800, now)).toBe(false)
    expect(isMediaWindowAccepted(1794096000, now)).toBe(false)
  })
  it('caps max-age at the end of acceptance', () => {
    expect(mediaMaxAgeSeconds(1794009600, now)).toBe(136800)
    expect(mediaMaxAgeSeconds(1793923200, now)).toBe(50400)
    expect(mediaMaxAgeSeconds(1793836800, now)).toBe(0)
  })
  it('returns zero max-age for a future window', () =>
    expect(mediaMaxAgeSeconds(1794096000, now)).toBe(0))
  it('builds and parses media paths', () => {
    const path = buildMediaPath(1794009600, sig, key)
    expect(path).toBe(`/media/1794009600/${sig}/${key}`)
    expect(parseMediaPath(path)).toEqual({
      windowStart: 1794009600,
      signature: sig,
      objectKey: key,
    })
  })
  it('rejects malformed media paths', () => {
    expect(parseMediaPath(`/media/1794009600/${sig}/img/../secret`)).toBeNull()
    expect(parseMediaPath(`/media/1794009601/${sig}/${key}`)).toBeNull()
    expect(parseMediaPath(`/media/abc/${sig}/${key}`)).toBeNull()
    expect(parseMediaPath(`/media/1794009600/${sig.toUpperCase()}/${key}`)).toBeNull()
    expect(parseMediaPath(`/media/1794009600/${sig}/${key.replace('768', '512')}`)).toBeNull()
    expect(parseMediaPath(`/media/1794009600/${sig}/incoming/u1/x`)).toBeNull()
    expect(parseMediaPath(`/media/1794009600/${sig}/${key}?x=1`)).toBeNull()
    expect(parseMediaPath(`/media/1794009600/${sig}/${key}/extra`)).toBeNull()
  })
  it('derives the cache key without window and signature', () => {
    expect(mediaCacheKey(`/media/1794009600/${sig}/${key}`)).toBe(`/media/${key}`)
    expect(mediaCacheKey('/api/me')).toBeNull()
  })
  it('builds variant keys', () =>
    expect(
      mediaVariantKey({
        leagueId: '0b7c2f4e-1a2b-4c3d-8e9f-0123456789ab',
        sourceSha256: 'a'.repeat(64),
        size: 768,
        format: 'avif',
      }),
    ).toBe(key))
})
