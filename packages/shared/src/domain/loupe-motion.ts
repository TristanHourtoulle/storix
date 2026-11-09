export const LOUPE_SWIPE_PX = 40
export const LOUPE_CLOSE_SWIPE_PX = 120

export type LoupeGesture = 'next' | 'prev' | 'close' | null

export interface Box {
  left: number
  top: number
  width: number
  height: number
}

export interface FlipTransform {
  x: number
  y: number
  scale: number
}

/** Reads a pointer travel on the loupe stage as a page change, a close, or nothing. */
export function loupeGesture(dx: number, dy: number): LoupeGesture {
  if (Math.abs(dx) > LOUPE_SWIPE_PX && Math.abs(dx) > Math.abs(dy)) return dx < 0 ? 'next' : 'prev'
  if (dy >= LOUPE_CLOSE_SWIPE_PX && dy > 2 * Math.abs(dx)) return 'close'
  return null
}

/** Wraps an index into `[0, count)`, returning 0 for an empty list. */
export function wrapIndex(index: number, count: number): number {
  if (count <= 0) return 0
  return ((index % count) + count) % count
}

/** Returns the transform that lays the `to` box over the `from` box, from a top-left origin. */
export function flipTransform(from: Box, to: Box): FlipTransform | null {
  if (from.width <= 0 || from.height <= 0 || to.width <= 0 || to.height <= 0) return null
  return { x: from.left - to.left, y: from.top - to.top, scale: from.width / to.width }
}

function roundTo(value: number, digits: number): number {
  const factor = 10 ** digits
  return (Math.sign(value) * Math.round(Math.abs(value) * factor)) / factor
}

/** Serialises a flip transform as a CSS `translate() scale()` string. */
export function flipTransformCss(transform: FlipTransform): string {
  return `translate(${roundTo(transform.x, 2)}px, ${roundTo(transform.y, 2)}px) scale(${roundTo(transform.scale, 4)})`
}

/** Tells whether a box intersects the viewport at all. */
export function isBoxInViewport(box: Box, viewportWidth: number, viewportHeight: number): boolean {
  return (
    box.left + box.width > 0 &&
    box.top + box.height > 0 &&
    box.left < viewportWidth &&
    box.top < viewportHeight
  )
}
