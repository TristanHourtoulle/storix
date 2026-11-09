import { describe, expect, it } from 'vitest'
import {
  captureOutputSize,
  cardCaptureRect,
  clampZoom,
  classifyCameraError,
  digitalZoomRange,
  nativeZoomRange,
  pinchZoom,
  viewfinderPoint,
} from './viewfinder'

const RATIO = 63 / 88

describe('cardCaptureRect', () => {
  it('crops a 4:3 portrait frame on its height', () =>
    expect(cardCaptureRect({ width: 1440, height: 1920 }, 1)).toEqual({
      x: 32,
      y: 0,
      width: 1375,
      height: 1920,
    }))
  it('crops a 16:9 portrait frame on its width', () =>
    expect(cardCaptureRect({ width: 1080, height: 1920 }, 1)).toEqual({
      x: 0,
      y: 205,
      width: 1080,
      height: 1509,
    }))
  it('crops a landscape frame to a centered portrait card', () =>
    expect(cardCaptureRect({ width: 1920, height: 1080 }, 1)).toEqual({
      x: 573,
      y: 0,
      width: 773,
      height: 1080,
    }))
  it('shrinks around the center when zoomed', () =>
    expect(cardCaptureRect({ width: 1440, height: 1920 }, 2)).toEqual({
      x: 376,
      y: 480,
      width: 687,
      height: 960,
    }))
  it('treats a zoom below 1 or NaN as 1', () => {
    expect(cardCaptureRect({ width: 1440, height: 1920 }, 0.5)?.width).toBe(1375)
    expect(cardCaptureRect({ width: 1440, height: 1920 }, Number.NaN)?.width).toBe(1375)
  })
  it('keeps the card ratio', () => {
    for (const size of [
      { width: 1440, height: 1920 },
      { width: 1080, height: 1920 },
      { width: 640, height: 480 },
    ]) {
      const rect = cardCaptureRect(size, 1.7)
      expect(Math.abs((rect?.width ?? 0) / (rect?.height ?? 1) - RATIO)).toBeLessThan(0.005)
    }
  })
  it('returns null before the first frame', () => {
    expect(cardCaptureRect({ width: 0, height: 0 }, 1)).toBeNull()
    expect(cardCaptureRect({ width: 1440, height: 0 }, 1)).toBeNull()
  })
})

describe('digitalZoomRange', () => {
  it('allows zoom down to the 700 px card floor', () =>
    expect(digitalZoomRange({ width: 1440, height: 1920 }).max).toBeCloseTo(2.743, 3))
  it('caps at the crop max zoom', () =>
    expect(digitalZoomRange({ width: 2160, height: 3840 })).toEqual({ min: 1, max: 3 }))
  it('has no zoom for a tiny stream', () =>
    expect(digitalZoomRange({ width: 640, height: 480 })).toEqual({ min: 1, max: 1 }))
})

describe('nativeZoomRange', () => {
  it('caps the span at 5x', () =>
    expect(nativeZoomRange({ min: 1, max: 10 })).toEqual({ min: 1, max: 5 }))
  it('keeps a smaller range', () =>
    expect(nativeZoomRange({ min: 1, max: 3 })).toEqual({ min: 1, max: 3 }))
  it('is null without zoom', () => {
    expect(nativeZoomRange(undefined)).toBeNull()
    expect(nativeZoomRange({ min: 1, max: 1 })).toBeNull()
    expect(nativeZoomRange({ min: Number.NaN, max: 4 })).toBeNull()
    expect(nativeZoomRange({ max: 4 })).toBeNull()
  })
})

describe('clampZoom and pinchZoom', () => {
  const range = { min: 1, max: 3 }
  it('clamps', () =>
    expect([clampZoom(7, range), clampZoom(0.5, range), clampZoom(Number.NaN, range)]).toEqual([
      3, 1, 1,
    ]))
  it('scales with the finger distance', () => expect(pinchZoom(1, 100, 200, range)).toBe(2))
  it('zooms out', () => expect(pinchZoom(2, 200, 100, range)).toBe(1))
  it('stops at max', () => expect(pinchZoom(2.5, 100, 300, range)).toBe(3))
  it('ignores a zero start distance', () => expect(pinchZoom(2, 0, 50, range)).toBe(2))
})

describe('captureOutputSize', () => {
  it('keeps a rect under the cap', () =>
    expect(captureOutputSize({ x: 32, y: 0, width: 1375, height: 1920 }, 2048)).toEqual({
      width: 1375,
      height: 1920,
    }))
  it('scales a large rect down to the cap', () =>
    expect(captureOutputSize({ x: 0, y: 411, width: 2160, height: 3017 }, 2048)).toEqual({
      width: 1466,
      height: 2048,
    }))
})

describe('viewfinderPoint', () => {
  const video = { width: 1440, height: 1920 }
  it('maps the center to the center', () =>
    expect(viewfinderPoint({ x: 0.5, y: 0.5 }, video, 1, false)).toEqual({ x: 0.5, y: 0.5 }))
  it('accounts for the cropped sides', () =>
    expect(viewfinderPoint({ x: 0, y: 0 }, video, 1, false).x).toBeCloseTo(0.0224, 3))
  it('un-mirrors the front camera', () =>
    expect(viewfinderPoint({ x: 0, y: 0 }, video, 1, true).x).toBeCloseTo(0.9776, 3))
  it('accounts for digital zoom', () => {
    const p = viewfinderPoint({ x: 0, y: 0 }, video, 2, false)
    expect([p.x, p.y].map((v) => Number(v.toFixed(3)))).toEqual([0.261, 0.25])
  })
})

describe('classifyCameraError', () => {
  it.each([
    ['NotAllowedError', 'denied'],
    ['SecurityError', 'denied'],
    ['PermissionDeniedError', 'denied'],
    ['NotReadableError', 'busy'],
    ['AbortError', 'busy'],
    ['TrackStartError', 'busy'],
    ['OverconstrainedError', 'overconstrained'],
    ['ConstraintNotSatisfiedError', 'overconstrained'],
    ['NotFoundError', 'unavailable'],
    ['DevicesNotFoundError', 'unavailable'],
    ['TypeError', 'unavailable'],
    ['Whatever', 'failed'],
  ])('%s → %s', (name, kind) => expect(classifyCameraError(name)).toBe(kind))
})
