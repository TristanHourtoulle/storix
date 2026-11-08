import { expect, it } from 'vitest'
import {
  AVATAR_CROP_FRAME,
  CARD_CROP_FRAME,
  canonicalCrop,
  clampCropView,
  cropRectFromView,
  cropRectOrNull,
  cropRectToPixels,
  cropViewFromRect,
  DEFAULT_CROP_VIEW,
  isCropRectValid,
  isDefaultCropView,
  maxCropZoom,
  panCropView,
  rotateCropView,
  rotatedSize,
  zoomCropViewAt,
  type CropRect,
} from './crop-frame'

const LAND = { width: 2048, height: 1536 }
const PORT = { width: 1536, height: 2048 }
const F = CARD_CROP_FRAME
const close = (a: CropRect, b: Omit<CropRect, 'rotate'>) =>
  (['x', 'y', 'w', 'h'] as const).forEach((k) => expect(a[k]).toBeCloseTo(b[k], 6))

it('default view on a landscape photo is the full-height centered card frame', () => {
  close(cropRectFromView(DEFAULT_CROP_VIEW, LAND, F), {
    x: 0.2315340909,
    y: 0,
    w: 0.5369318182,
    h: 1,
  })
})
it('default view on a portrait photo keeps the full height', () => {
  close(cropRectFromView(DEFAULT_CROP_VIEW, PORT, F), {
    x: 0.0227272727,
    y: 0,
    w: 0.9545454545,
    h: 1,
  })
})
it('rotate 90 works on the rotated space', () => {
  const rect = cropRectFromView({ ...DEFAULT_CROP_VIEW, rotate: 90 }, LAND, F)
  close(rect, { x: 0.0227272727, y: 0, w: 0.9545454545, h: 1 })
  expect(rect.rotate).toBe(90)
})
it('zoom 2 centered halves the frame', () => {
  close(cropRectFromView({ ...DEFAULT_CROP_VIEW, zoom: 2 }, LAND, F), {
    x: 0.3657670455,
    y: 0.25,
    w: 0.2684659091,
    h: 0.5,
  })
})
it('clamps the center so the rect stays inside', () => {
  const v = clampCropView({ zoom: 2, centerX: 0, centerY: 0, rotate: 0 }, LAND, F)
  expect(v.centerX).toBeCloseTo(0.1342329545, 6)
  expect(v.centerY).toBeCloseTo(0.25, 6)
  close(cropRectFromView(v, LAND, F), { x: 0, y: 0, w: 0.2684659091, h: 0.5 })
})
it('caps the zoom by source resolution and locks small images at 1', () => {
  expect(maxCropZoom(LAND, F, 0)).toBeCloseTo(1536 / 700, 6)
  expect(maxCropZoom({ width: 600, height: 400 }, F, 0)).toBe(1)
  expect(maxCropZoom({ width: 8000, height: 6000 }, F, 0)).toBe(3)
  expect(clampCropView({ ...DEFAULT_CROP_VIEW, zoom: 0.2 }, LAND, F).zoom).toBe(1)
})
it('pans opposite to the finger in image space', () => {
  const v = panCropView(
    { ...DEFAULT_CROP_VIEW, zoom: 2 },
    { dxPx: 100, dyPx: 0, viewportWidthPx: 300 },
    LAND,
    F,
  )
  expect(v.centerX).toBeCloseTo(0.4105113636, 6)
  expect(v.centerY).toBeCloseTo(0.5, 6)
})
it('zooms around the focus point and clamps to the max', () => {
  const v = zoomCropViewAt(DEFAULT_CROP_VIEW, { factor: 2, focusX: 1, focusY: 0.5 }, LAND, F)
  expect(v.zoom).toBeCloseTo(2, 6)
  expect(v.centerX).toBeCloseTo(0.6342329545, 6)
  expect(
    zoomCropViewAt(DEFAULT_CROP_VIEW, { factor: 10, focusX: 0.5, focusY: 0.5 }, LAND, F).zoom,
  ).toBeCloseTo(1536 / 700, 6)
})
it('round-trips view and rect', () => {
  const v = { zoom: 1.7, centerX: 0.41, centerY: 0.55, rotate: 0 } as const
  const back = cropViewFromRect(cropRectFromView(v, LAND, F), LAND, F)
  expect(back.zoom).toBeCloseTo(1.7, 6)
  expect(back.centerX).toBeCloseTo(0.41, 6)
  expect(back.centerY).toBeCloseTo(0.55, 6)
})
it('returns null for the default view and after a rotate-and-back', () => {
  expect(cropRectOrNull(DEFAULT_CROP_VIEW, LAND, F)).toBeNull()
  expect(cropRectOrNull({ ...DEFAULT_CROP_VIEW, zoom: 1.2 }, LAND, F)).not.toBeNull()
  const fourTurns = [1, 2, 3, 4].reduce((v) => rotateCropView(v), DEFAULT_CROP_VIEW)
  expect(isDefaultCropView(fourTurns)).toBe(true)
})
it('validates bounds and frame ratio against the real size', () => {
  expect(
    isCropRectValid({ x: 0.2315340909, y: 0, w: 0.5369318182, h: 1, rotate: 0 }, LAND, F),
  ).toBe(true)
  expect(isCropRectValid({ x: 0.2, y: 0, w: 0.6, h: 1, rotate: 0 }, LAND, F)).toBe(false)
  expect(isCropRectValid({ x: 0.6, y: 0, w: 0.5369318182, h: 1, rotate: 0 }, LAND, F)).toBe(false)
  expect(isCropRectValid({ x: 0, y: 0, w: 0, h: 1, rotate: 0 }, LAND, F)).toBe(false)
  expect(isCropRectValid({ x: Number.NaN, y: 0, w: 0.5, h: 1, rotate: 0 }, LAND, F)).toBe(false)
  expect(
    isCropRectValid({ x: 0.0227272727, y: 0, w: 0.9545454545, h: 1, rotate: 90 }, LAND, F),
  ).toBe(true)
  expect(
    isCropRectValid({ x: 0.0227272727, y: 0, w: 0.9545454545, h: 1, rotate: 0 }, LAND, F),
  ).toBe(false)
})
it('converts to integer pixels inside the rotated image', () => {
  expect(cropRectToPixels(cropRectFromView(DEFAULT_CROP_VIEW, LAND, F), LAND)).toEqual({
    left: 474,
    top: 0,
    width: 1100,
    height: 1536,
  })
  const pano = cropRectToPixels(
    cropRectFromView(DEFAULT_CROP_VIEW, { width: 10000, height: 100 }, F),
    { width: 10000, height: 100 },
  )
  expect(pano).toEqual({ left: 4964, top: 0, width: 72, height: 100 })
  const tiny = cropRectToPixels(
    { x: 0.99, y: 0.99, w: 0.01, h: 0.01, rotate: 0 },
    { width: 3, height: 3 },
  )
  expect(tiny.width).toBeGreaterThanOrEqual(1)
  expect(tiny.left + tiny.width).toBeLessThanOrEqual(3)
})
it('square avatar frame on a landscape photo', () => {
  close(cropRectFromView(DEFAULT_CROP_VIEW, LAND, AVATAR_CROP_FRAME), {
    x: 0.125,
    y: 0,
    w: 0.75,
    h: 1,
  })
})
it('swaps the size for quarter turns only', () => {
  expect(rotatedSize(LAND, 90)).toEqual(PORT)
  expect(rotatedSize(LAND, 180)).toEqual(LAND)
})
it('serializes a crop rect with 6 decimals', () => {
  expect(canonicalCrop({ x: 0.2315340909, y: 0, w: 0.5369318182, h: 1, rotate: 90 })).toBe(
    '0.231534,0.000000,0.536932,1.000000,90',
  )
})

it('refuses a degenerate rect at the right edge and keeps its pixels non-empty', () => {
  const edge = { x: 1, y: 0, w: 1e-6, h: 1.86e-6, rotate: 0 } as const
  expect(isCropRectValid(edge, LAND, F)).toBe(false)
  const px = cropRectToPixels(edge, LAND)
  expect(px.left).toBe(2047)
  expect(px.width).toBe(1)
  expect(px.height).toBe(1)
})
it('refuses a rect zoomed beyond the resolution cap', () => {
  const atCap = cropRectFromView({ ...DEFAULT_CROP_VIEW, zoom: 10 }, LAND, F)
  expect(isCropRectValid(atCap, LAND, F)).toBe(true)
  const beyond = { x: 0.4, y: 0.4, w: atCap.w / 1.5, h: atCap.h / 1.5, rotate: 0 } as const
  expect(isCropRectValid(beyond, LAND, F)).toBe(false)
  expect(isCropRectValid({ x: 0.5, y: 0.5, w: 0.0005, h: 0.000932, rotate: 0 }, LAND, F)).toBe(
    false,
  )
})
it('handles 180 and 270 rotations', () => {
  expect(maxCropZoom(LAND, F, 180)).toBeCloseTo(1536 / 700, 6)
  expect(maxCropZoom(LAND, F, 270)).toBeCloseTo(2048 / 700, 6)
  const portraitRect = { x: 0.0227272727, y: 0, w: 0.9545454545, h: 1 }
  const landRect = { x: 0.2315340909, y: 0, w: 0.5369318182, h: 1 }
  expect(isCropRectValid({ ...portraitRect, rotate: 270 }, LAND, F)).toBe(true)
  expect(isCropRectValid({ ...landRect, rotate: 270 }, LAND, F)).toBe(false)
  expect(isCropRectValid({ ...landRect, rotate: 180 }, LAND, F)).toBe(true)
  expect(isCropRectValid({ ...portraitRect, rotate: 180 }, LAND, F)).toBe(false)
  expect(cropRectToPixels({ ...portraitRect, rotate: 270 }, LAND)).toEqual({
    left: 34,
    top: 0,
    width: 1466,
    height: 2048,
  })
})
it('pans vertically on the frame height', () => {
  const v = panCropView(
    { ...DEFAULT_CROP_VIEW, zoom: 2 },
    { dxPx: 0, dyPx: 100, viewportWidthPx: 300 },
    LAND,
    F,
  )
  expect(v.centerX).toBeCloseTo(0.5, 6)
  expect(v.centerY).toBeCloseTo(0.5 - (100 / (300 / F.aspect)) * 0.5, 6)
})
it('accepts the ratio within 2 % and refuses beyond', () => {
  const at = (scale: number) => ({ x: 0, y: 0, w: 0.5369318182 * scale, h: 1, rotate: 0 }) as const
  expect(isCropRectValid(at(1.019), LAND, F)).toBe(true)
  expect(isCropRectValid(at(1.021), LAND, F)).toBe(false)
})
it('ignores unusable pan and zoom input instead of recentering', () => {
  const view = { zoom: 2, centerX: 0.4, centerY: 0.3, rotate: 0 } as const
  expect(panCropView(view, { dxPx: 10, dyPx: 0, viewportWidthPx: 0 }, LAND, F)).toEqual(view)
  expect(panCropView(view, { dxPx: Number.NaN, dyPx: 0, viewportWidthPx: 300 }, LAND, F)).toEqual(
    view,
  )
  expect(zoomCropViewAt(view, { factor: Number.NaN, focusX: 0.5, focusY: 0.5 }, LAND, F)).toEqual(
    view,
  )
  expect(zoomCropViewAt(view, { factor: 0, focusX: 0.5, focusY: 0.5 }, LAND, F)).toEqual(view)
  expect(zoomCropViewAt(view, { factor: 2, focusX: Number.NaN, focusY: 0.5 }, LAND, F)).toEqual(
    view,
  )
})
