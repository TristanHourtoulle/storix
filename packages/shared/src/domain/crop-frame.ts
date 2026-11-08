export const CROP_ROTATIONS = [0, 90, 180, 270] as const

export type CropRotation = (typeof CROP_ROTATIONS)[number]

export interface ImageSize {
  width: number
  height: number
}

export interface CropFrame {
  aspect: number
  minSourceEdgePx: number
  maxZoom: number
}

export const CARD_CROP_FRAME: CropFrame = { aspect: 63 / 88, minSourceEdgePx: 700, maxZoom: 3 }
export const AVATAR_CROP_FRAME: CropFrame = { aspect: 1, minSourceEdgePx: 512, maxZoom: 4 }

export const CROP_RATIO_TOLERANCE = 0.02

/** A crop rectangle normalized on the rotated image. */
export interface CropRect {
  x: number
  y: number
  w: number
  h: number
  rotate: CropRotation
}

/** A crop view whose center is normalized on the rotated image. */
export interface CropView {
  zoom: number
  centerX: number
  centerY: number
  rotate: CropRotation
}

export const DEFAULT_CROP_VIEW: CropView = { zoom: 1, centerX: 0.5, centerY: 0.5, rotate: 0 }

const BOUNDS_EPSILON = 1e-6
const DEFAULT_ZOOM_EPSILON = 0.001
const DEFAULT_CENTER_EPSILON = 0.002
const CANONICAL_DECIMALS = 6

interface FrameSize {
  w: number
  h: number
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function finiteOr(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback
}

/** Returns the image size after a clockwise rotation. */
export function rotatedSize(size: ImageSize, rotate: CropRotation): ImageSize {
  return rotate === 90 || rotate === 270 ? { width: size.height, height: size.width } : size
}

function baseFrameSize(size: ImageSize, frame: CropFrame, rotate: CropRotation): FrameSize {
  const rotated = rotatedSize(size, rotate)
  const imageAspect = rotated.width / rotated.height
  return imageAspect > frame.aspect
    ? { w: frame.aspect / imageAspect, h: 1 }
    : { w: 1, h: imageAspect / frame.aspect }
}

function frameSizeAt(base: FrameSize, zoom: number): FrameSize {
  return { w: base.w / zoom, h: base.h / zoom }
}

/** Returns the highest zoom that keeps the crop's long edge at or above the frame's minimum. */
export function maxCropZoom(size: ImageSize, frame: CropFrame, rotate: CropRotation): number {
  const rotated = rotatedSize(size, rotate)
  const base = baseFrameSize(size, frame, rotate)
  const longEdge = Math.max(base.w * rotated.width, base.h * rotated.height)
  return clamp(longEdge / frame.minSourceEdgePx, 1, frame.maxZoom)
}

/** Clamps the zoom to the allowed range and the center so the crop stays inside the image. */
export function clampCropView(view: CropView, size: ImageSize, frame: CropFrame): CropView {
  const zoom = clamp(finiteOr(view.zoom, 1), 1, maxCropZoom(size, frame, view.rotate))
  const { w, h } = frameSizeAt(baseFrameSize(size, frame, view.rotate), zoom)
  return {
    zoom,
    centerX: clamp(finiteOr(view.centerX, 0.5), w / 2, 1 - w / 2),
    centerY: clamp(finiteOr(view.centerY, 0.5), h / 2, 1 - h / 2),
    rotate: view.rotate,
  }
}

/** Returns the crop rectangle shown by a view, after clamping it. */
export function cropRectFromView(view: CropView, size: ImageSize, frame: CropFrame): CropRect {
  const clamped = clampCropView(view, size, frame)
  const { w, h } = frameSizeAt(baseFrameSize(size, frame, clamped.rotate), clamped.zoom)
  return {
    x: clamped.centerX - w / 2,
    y: clamped.centerY - h / 2,
    w,
    h,
    rotate: clamped.rotate,
  }
}

/** Returns the view that shows a crop rectangle. */
export function cropViewFromRect(rect: CropRect, size: ImageSize, frame: CropFrame): CropView {
  const base = baseFrameSize(size, frame, rect.rotate)
  return clampCropView(
    {
      zoom: base.w / rect.w,
      centerX: rect.x + rect.w / 2,
      centerY: rect.y + rect.h / 2,
      rotate: rect.rotate,
    },
    size,
    frame,
  )
}

/** Moves the image with the finger: the crop center moves the opposite way. */
export function panCropView(
  view: CropView,
  delta: { dxPx: number; dyPx: number; viewportWidthPx: number },
  size: ImageSize,
  frame: CropFrame,
): CropView {
  const clamped = clampCropView(view, size, frame)
  const isUsable =
    delta.viewportWidthPx > 0 && Number.isFinite(delta.dxPx) && Number.isFinite(delta.dyPx)
  if (!isUsable) return clamped
  const { w, h } = frameSizeAt(baseFrameSize(size, frame, clamped.rotate), clamped.zoom)
  const viewportHeightPx = delta.viewportWidthPx / frame.aspect
  return clampCropView(
    {
      ...clamped,
      centerX: clamped.centerX - (delta.dxPx / delta.viewportWidthPx) * w,
      centerY: clamped.centerY - (delta.dyPx / viewportHeightPx) * h,
    },
    size,
    frame,
  )
}

/** Zooms by a factor while keeping the image point under the focus (viewport fractions) fixed. */
export function zoomCropViewAt(
  view: CropView,
  input: { factor: number; focusX: number; focusY: number },
  size: ImageSize,
  frame: CropFrame,
): CropView {
  const current = clampCropView(view, size, frame)
  const isUsable =
    input.factor > 0 &&
    Number.isFinite(input.factor) &&
    [input.focusX, input.focusY].every(Number.isFinite)
  if (!isUsable) return current
  const base = baseFrameSize(size, frame, current.rotate)
  const before = frameSizeAt(base, current.zoom)
  const zoom = clamp(current.zoom * input.factor, 1, maxCropZoom(size, frame, current.rotate))
  const after = frameSizeAt(base, zoom)
  return clampCropView(
    {
      zoom,
      centerX: current.centerX + (input.focusX - 0.5) * before.w - (input.focusX - 0.5) * after.w,
      centerY: current.centerY + (input.focusY - 0.5) * before.h - (input.focusY - 0.5) * after.h,
      rotate: current.rotate,
    },
    size,
    frame,
  )
}

/** Turns the image a quarter clockwise and resets the zoom and center. */
export function rotateCropView(view: CropView): CropView {
  const index = CROP_ROTATIONS.indexOf(view.rotate)
  const rotate = CROP_ROTATIONS[(index + 1) % CROP_ROTATIONS.length] ?? 0
  return { ...DEFAULT_CROP_VIEW, rotate }
}

/** Tells whether a view equals the automatic center crop. */
export function isDefaultCropView(view: CropView): boolean {
  return (
    Math.abs(view.zoom - 1) < DEFAULT_ZOOM_EPSILON &&
    Math.abs(view.centerX - 0.5) < DEFAULT_CENTER_EPSILON &&
    Math.abs(view.centerY - 0.5) < DEFAULT_CENTER_EPSILON &&
    view.rotate === 0
  )
}

/** Returns the crop rectangle of a view, or null when the view is the automatic center crop. */
export function cropRectOrNull(view: CropView, size: ImageSize, frame: CropFrame): CropRect | null {
  const clamped = clampCropView(view, size, frame)
  return isDefaultCropView(clamped) ? null : cropRectFromView(clamped, size, frame)
}

/** Checks a crop rectangle's bounds, its zoom cap and its frame ratio against the real image size. */
export function isCropRectValid(rect: CropRect, size: ImageSize, frame: CropFrame): boolean {
  const { x, y, w, h } = rect
  if (![x, y, w, h].every(Number.isFinite)) return false
  if (!CROP_ROTATIONS.includes(rect.rotate)) return false
  if (x < 0 || y < 0 || w <= 0 || h <= 0) return false
  if (x + w > 1 + BOUNDS_EPSILON || y + h > 1 + BOUNDS_EPSILON) return false
  const smallest = frameSizeAt(
    baseFrameSize(size, frame, rect.rotate),
    maxCropZoom(size, frame, rect.rotate),
  )
  const minScale = 1 - CROP_RATIO_TOLERANCE
  if (w < smallest.w * minScale || h < smallest.h * minScale) return false
  const rotated = rotatedSize(size, rect.rotate)
  const ratio = (w * rotated.width) / (h * rotated.height)
  return Math.abs(ratio / frame.aspect - 1) <= CROP_RATIO_TOLERANCE
}

/** Converts a crop rectangle to integer pixels of the rotated image (at least 1×1); `size` is the unrotated size. */
export function cropRectToPixels(
  rect: CropRect,
  size: ImageSize,
): { left: number; top: number; width: number; height: number } {
  const rotated = rotatedSize(size, rect.rotate)
  const left = clamp(Math.floor(rect.x * rotated.width), 0, rotated.width - 1)
  const top = clamp(Math.floor(rect.y * rotated.height), 0, rotated.height - 1)
  return {
    left,
    top,
    width: Math.max(1, clamp(Math.round(rect.w * rotated.width), 1, rotated.width - left)),
    height: Math.max(1, clamp(Math.round(rect.h * rotated.height), 1, rotated.height - top)),
  }
}

/** Serializes a crop rectangle as `x,y,w,h,rotate` with 6 decimals. */
export function canonicalCrop(rect: CropRect): string {
  const parts = [rect.x, rect.y, rect.w, rect.h].map((value) => value.toFixed(CANONICAL_DECIMALS))
  return [...parts, String(rect.rotate)].join(',')
}
