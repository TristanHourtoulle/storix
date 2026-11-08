import { describe, expect, it } from 'vitest'
import { AVATAR_CROP_FRAME, cropRectFromView, maxCropZoom } from './crop-frame'
import {
  PORTRAIT_OBJECT_KEY_PATTERN,
  portraitCropPixels,
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

describe('portraitCropPixels', () => {
  it('null crop is the centered largest square', () => {
    expect(portraitCropPixels(null, { width: 2000, height: 1000 })).toEqual({
      left: 500,
      top: 0,
      size: 1000,
    })
    expect(portraitCropPixels(null, { width: 1000, height: 2000 })).toEqual({
      left: 0,
      top: 500,
      size: 1000,
    })
  })

  it('a zoomed view gives the matching sub-square', () => {
    const rect = cropRectFromView(
      { zoom: 2, centerX: 0.5, centerY: 0.5, rotate: 0 },
      { width: 2000, height: 2000 },
      AVATAR_CROP_FRAME,
    )
    expect(portraitCropPixels(rect, { width: 2000, height: 2000 })).toEqual({
      left: 500,
      top: 500,
      size: 1000,
    })
  })

  it('extreme panorama and tiny images stay inside bounds and never empty', () => {
    expect(portraitCropPixels(null, { width: 6000, height: 300 })).toEqual({
      left: 2850,
      top: 0,
      size: 300,
    })
    expect(maxCropZoom({ width: 64, height: 64 }, AVATAR_CROP_FRAME, 0)).toBe(1)
    expect(portraitCropPixels(null, { width: 64, height: 64 })).toEqual({
      left: 0,
      top: 0,
      size: 64,
    })
    const tiny = portraitCropPixels(
      { x: 0.999, y: 0, w: 0.001, h: 1, rotate: 0 },
      { width: 3, height: 3 },
    )
    expect(tiny.size).toBeGreaterThanOrEqual(1)
    expect(tiny.left + tiny.size).toBeLessThanOrEqual(3)
    expect(tiny.top + tiny.size).toBeLessThanOrEqual(3)
  })

  it('falls back to the automatic crop when the rect has a non-finite field', () => {
    const size = { width: 2000, height: 1000 }
    const automatic = portraitCropPixels(null, size)
    for (const bad of [
      { x: Number.NaN, y: 0, w: 0.5, h: 0.5, rotate: 0 },
      { x: 0, y: Number.POSITIVE_INFINITY, w: 0.5, h: 0.5, rotate: 0 },
      { x: 0, y: 0, w: Number.NaN, h: 0.5, rotate: 0 },
      { x: 0, y: 0, w: 0.5, h: Number.NEGATIVE_INFINITY, rotate: 0 },
    ] as const) {
      expect(portraitCropPixels(bad, size)).toEqual(automatic)
    }
  })

  it('treats a rotated rect as unrotated and keeps a square inside the image', () => {
    const result = portraitCropPixels(
      { x: 0.9, y: 0.9, w: 0.5, h: 0.5, rotate: 90 },
      { width: 1000, height: 400 },
    )
    expect(result.size).toBeGreaterThanOrEqual(1)
    expect(result.left + result.size).toBeLessThanOrEqual(1000)
    expect(result.top + result.size).toBeLessThanOrEqual(400)
  })
})
