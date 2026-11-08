import { describe, expect, it } from 'vitest'
import {
  buildMediaPath,
  isMediaObjectKey,
  isMediaWindowAccepted,
  leagueMediaPrefix,
  mediaCachePathPrefix,
  mediaCacheKey,
  mediaCropVariantKey,
  mediaMaxAgeSeconds,
  mediaPrefix,
  mediaVariantKey,
  mediaWindowStart,
  parseMediaPath,
} from './media-urls'
import { mediaPrefixOfKey } from './storage-gc'

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

describe('media prefixes', () => {
  const leagueId = '0b6f7c1e-3a59-4c1e-9d7e-2f1a6c3b4d5e'
  const sha = 'a'.repeat(64)

  it('builds media prefixes', () => {
    expect(mediaPrefix({ leagueId, sourceSha256: sha })).toBe(`img/${leagueId}/${sha}/`)
    expect(
      mediaVariantKey({ leagueId, sourceSha256: sha, size: 256, format: 'avif' }).startsWith(
        mediaPrefix({ leagueId, sourceSha256: sha }),
      ),
    ).toBe(true)
    expect(leagueMediaPrefix(leagueId)).toBe(`img/${leagueId}/`)
    expect(mediaCachePathPrefix(leagueMediaPrefix(leagueId))).toBe(`/media/img/${leagueId}/`)
  })
})

describe('cropped variant keys', () => {
  const leagueId = '0b7c2f4e-1a2b-4c3d-8e9f-0123456789ab'
  const sha = 'a'.repeat(64)
  const cropId = '0123456789abcdef'
  const cropKey = `img/${leagueId}/${sha}/c${cropId}/768.webp`

  it('builds the cropped variant path', () =>
    expect(
      mediaCropVariantKey({ leagueId, sourceSha256: sha, cropId, size: 768, format: 'webp' }),
    ).toBe(cropKey))
  it('parses a cropped media path', () =>
    expect(parseMediaPath(`/media/1794009600/${sig}/${cropKey}`)).toEqual({
      windowStart: 1794009600,
      signature: sig,
      objectKey: cropKey,
    }))
  it('rejects malformed crop segments', () => {
    const base = `/media/1794009600/${sig}/img/${leagueId}/${sha}`
    expect(parseMediaPath(`${base}/c012/768.webp`)).toBeNull()
    expect(parseMediaPath(`${base}/C0123456789abcdef/768.webp`)).toBeNull()
    expect(parseMediaPath(`${base}/c0123456789ABCDEF/768.webp`)).toBeNull()
    expect(parseMediaPath(`${base}/cx/768.webp`)).toBeNull()
    expect(parseMediaPath(`${base}/c${cropId}/c${cropId}/768.webp`)).toBeNull()
  })
  it('keeps the crop segment in the cache key', () =>
    expect(mediaCacheKey(`/media/1794009600/${sig}/${cropKey}`)).toBe(`/media/${cropKey}`))
  it('maps a cropped key to the prefix of its media', () =>
    expect(mediaPrefixOfKey(cropKey)).toBe(mediaPrefix({ leagueId, sourceSha256: sha })))
})

describe('portrait media paths', () => {
  const UPLOAD = '3f2b8c1e-4a5d-4e6f-8a9b-0c1d2e3f4a5b'
  const L = '0b7c2f4e-1a2b-4c3d-8e9f-0123456789ab'
  const SHA = 'a'.repeat(64)

  it('parses a signed portrait path and gives its window-free cache key', () => {
    const portraitKey = `pic/avatar/u1abc/${UPLOAD}/128.webp`
    const path = buildMediaPath(86_400, 'a'.repeat(64), portraitKey)
    expect(parseMediaPath(path)?.objectKey).toBe(portraitKey)
    expect(mediaCacheKey(path)).toBe(`/media/${portraitKey}`)
  })
  it('isMediaObjectKey accepts img, cropped img and pic keys only', () => {
    expect(isMediaObjectKey(`img/${L}/${SHA}/256.webp`)).toBe(true)
    expect(isMediaObjectKey(`img/${L}/${SHA}/c${'0'.repeat(16)}/768.avif`)).toBe(true)
    expect(isMediaObjectKey(`pic/league/${L}/${UPLOAD}/512.webp`)).toBe(true)
    expect(isMediaObjectKey('incoming/u1/x')).toBe(false)
    expect(isMediaObjectKey(`pic/league/${L}/${UPLOAD}/256.webp`)).toBe(false)
  })
})
