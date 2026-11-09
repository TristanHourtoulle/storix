import { describe, expect, it } from 'vitest'
import { flipTransform, flipTransformCss, isBoxInViewport, loupeGesture, wrapIndex } from './loupe-motion'

describe('loupe motion', () => {
  it('reads a horizontal swipe past 40 px', () => {
    expect(loupeGesture(-41, 0)).toBe('next')
    expect(loupeGesture(41, 5)).toBe('prev')
    expect(loupeGesture(40, 0)).toBeNull()
    expect(loupeGesture(-60, -70)).toBeNull()
  })

  it('closes only on a long, mostly vertical swipe down', () => {
    expect(loupeGesture(10, 121)).toBe('close')
    expect(loupeGesture(0, 119)).toBeNull()
    expect(loupeGesture(70, 121)).toBeNull()
    expect(loupeGesture(0, -200)).toBeNull()
    expect(loupeGesture(0, 0)).toBeNull()
  })

  it('wraps indexes', () => {
    expect(wrapIndex(5, 5)).toBe(0)
    expect(wrapIndex(-1, 5)).toBe(4)
    expect(wrapIndex(2, 5)).toBe(2)
    expect(wrapIndex(3, 0)).toBe(0)
  })

  it('maps the target box onto the source box from the top-left origin', () => {
    const from = { left: 40, top: 500, width: 72, height: 100.8 }
    const to = { left: 20, top: 100, width: 360, height: 504 }
    expect(flipTransform(from, to)).toEqual({ x: 20, y: 400, scale: 0.2 })
    expect(flipTransformCss({ x: 20, y: 400, scale: 0.2 })).toBe('translate(20px, 400px) scale(0.2)')
    expect(flipTransformCss({ x: 1 / 3, y: -2.005, scale: 0.123456 })).toBe(
      'translate(0.33px, -2.01px) scale(0.1235)',
    )
  })

  it('refuses empty boxes', () => {
    const box = { left: 0, top: 0, width: 100, height: 140 }
    expect(flipTransform({ ...box, width: 0 }, box)).toBeNull()
    expect(flipTransform(box, { ...box, height: 0 })).toBeNull()
  })

  it('detects boxes outside the viewport', () => {
    expect(isBoxInViewport({ left: 10, top: 10, width: 50, height: 70 }, 390, 844)).toBe(true)
    expect(isBoxInViewport({ left: 10, top: -80, width: 50, height: 70 }, 390, 844)).toBe(false)
    expect(isBoxInViewport({ left: 10, top: 850, width: 50, height: 70 }, 390, 844)).toBe(false)
  })
})
