import { describe, expect, it } from 'vitest'
import {
  PORTRAIT_OBJECT_KEY_PATTERN,
  portraitOwnerPrefix,
  portraitPrefix,
  portraitVariantKey,
  storedPortraitKeys,
} from './portraits'

const UPLOAD = '3f2b8c1e-4a5d-4e6f-8a9b-0c1d2e3f4a5b'

describe('portrait keys', () => {
  it('builds owner, upload prefix, variant keys and stored keys', () => {
    const owner = { kind: 'avatar', ownerId: 'AbC123xyz' } as const
    expect(portraitOwnerPrefix(owner)).toBe('pic/avatar/AbC123xyz/')
    expect(portraitPrefix({ ...owner, uploadId: UPLOAD })).toBe(`pic/avatar/AbC123xyz/${UPLOAD}/`)
    expect(portraitVariantKey({ ...owner, uploadId: UPLOAD, size: 512 })).toBe(
      `pic/avatar/AbC123xyz/${UPLOAD}/512.webp`,
    )
    expect(storedPortraitKeys({ ...owner, uploadId: UPLOAD })).toEqual([
      `pic/avatar/AbC123xyz/${UPLOAD}/128.webp`,
      `pic/avatar/AbC123xyz/${UPLOAD}/512.webp`,
    ])
  })

  it('key pattern accepts both kinds and rejects other sizes, formats and traversal', () => {
    expect(PORTRAIT_OBJECT_KEY_PATTERN.test(`pic/league/${UPLOAD}/${UPLOAD}/128.webp`)).toBe(true)
    expect(PORTRAIT_OBJECT_KEY_PATTERN.test(`pic/avatar/AbC_1-x/${UPLOAD}/512.webp`)).toBe(true)
    for (const bad of [
      `pic/avatar/u1/${UPLOAD}/256.webp`,
      `pic/avatar/u1/${UPLOAD}/512.avif`,
      `pic/avatar/../${UPLOAD}/512.webp`,
      `pic/team/u1/${UPLOAD}/512.webp`,
      `pic/avatar/u1/not-a-uuid/512.webp`,
      `pic/avatar//${UPLOAD}/512.webp`,
      `pic/avatar/${'a'.repeat(65)}/${UPLOAD}/512.webp`,
    ])
      expect(PORTRAIT_OBJECT_KEY_PATTERN.test(bad)).toBe(false)
  })
})
