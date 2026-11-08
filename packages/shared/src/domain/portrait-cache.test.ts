import { describe, expect, it } from 'vitest'
import { portraitPrefixOfMediaUrl, stalePortraitCachePaths } from './portrait-cache'

const L = '0b6f7c1e-3a59-4c1e-9d7e-2f1a6c3b4d5e'
const SHA = 'a'.repeat(64)
const SIG = 'a'.repeat(64)
const U = '3f2b8c1e-4a5d-4e6f-8a9b-0c1d2e3f4a5b'
const U1 = '1a2b3c4d-1111-4e6f-8a9b-0c1d2e3f4a5b'
const U2 = '1a2b3c4d-2222-4e6f-8a9b-0c1d2e3f4a5b'
const U3 = '1a2b3c4d-3333-4e6f-8a9b-0c1d2e3f4a5b'

describe('portraitPrefixOfMediaUrl', () => {
  it('extracts the upload prefix from a signed portrait URL', () => {
    expect(portraitPrefixOfMediaUrl(`/media/86400/${SIG}/pic/avatar/u1/${U}/512.webp`)).toBe(
      `pic/avatar/u1/${U}/`,
    )
    expect(
      portraitPrefixOfMediaUrl(
        `https://x.test/media/86400/${SIG}/pic/league/${L}/${U}/128.webp?v=1`,
      ),
    ).toBe(`pic/league/${L}/${U}/`)
    expect(portraitPrefixOfMediaUrl(`/media/86400/${SIG}/img/${L}/${SHA}/256.webp`)).toBeNull()
  })

  it('returns null for malformed URLs', () => {
    expect(portraitPrefixOfMediaUrl('')).toBeNull()
    expect(portraitPrefixOfMediaUrl('/api/me')).toBeNull()
    expect(portraitPrefixOfMediaUrl(`/media/86400/${SIG}/pic/avatar/u1/${U}/256.webp`)).toBeNull()
    expect(portraitPrefixOfMediaUrl('http://[bad')).toBeNull()
  })
})

describe('stalePortraitCachePaths', () => {
  const cached = [
    `/media/pic/avatar/u1/${U1}/512.webp`,
    `/media/pic/avatar/u1/${U2}/128.webp`,
    `/media/pic/avatar/u2/${U3}/512.webp`,
    `/media/img/${L}/${SHA}/256.webp`,
  ]

  it('selects stale entries of known owners only', () => {
    expect(
      stalePortraitCachePaths(cached, [
        { ownerPrefix: 'pic/avatar/u1/', currentPrefix: `pic/avatar/u1/${U2}/` },
      ]),
    ).toEqual([`/media/pic/avatar/u1/${U1}/512.webp`])
    expect(
      stalePortraitCachePaths(cached, [{ ownerPrefix: 'pic/avatar/u2/', currentPrefix: null }]),
    ).toEqual([`/media/pic/avatar/u2/${U3}/512.webp`])
  })

  it('does not mistake an owner id that extends another for the same owner', () => {
    expect(
      stalePortraitCachePaths(
        [`/media/pic/avatar/u10/${U1}/512.webp`],
        [{ ownerPrefix: 'pic/avatar/u1/', currentPrefix: null }],
      ),
    ).toEqual([])
  })

  it('keeps everything when no owner is known', () => {
    expect(stalePortraitCachePaths(cached, [])).toEqual([])
  })
})
