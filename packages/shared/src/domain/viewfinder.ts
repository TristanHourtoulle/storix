import { CARD_CROP_FRAME, type ImageSize } from './crop-frame'

export interface PixelRect {
  x: number
  y: number
  width: number
  height: number
}

export interface ZoomRange {
  min: number
  max: number
}

export interface NormalizedPoint {
  x: number
  y: number
}

export type CameraFailure = 'denied' | 'busy' | 'overconstrained' | 'unavailable' | 'failed'

export const VIEWFINDER_NATIVE_ZOOM_SPAN = 5

const CAMERA_FAILURES: ReadonlyMap<string, CameraFailure> = new Map<string, CameraFailure>([
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
])

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function effectiveZoom(zoom: number): number {
  return Number.isFinite(zoom) && zoom > 1 ? zoom : 1
}

function cropSize(video: ImageSize, zoom: number): ImageSize | null {
  const { width, height } = video
  if (!(width > 0 && height > 0)) return null
  const aspect = CARD_CROP_FRAME.aspect
  const base =
    width / height > aspect ? { width: height * aspect, height } : { width, height: width / aspect }
  const z = effectiveZoom(zoom)
  return { width: base.width / z, height: base.height / z }
}

/** Largest centered 63:88 rect of the video frame, shrunk by `zoom` (< 1 or NaN counts as 1); null for an empty frame. */
export function cardCaptureRect(video: ImageSize, zoom: number): PixelRect | null {
  const size = cropSize(video, zoom)
  if (!size) return null
  const width = Math.round(size.width)
  const height = Math.round(size.height)
  return {
    x: Math.floor((video.width - width) / 2),
    y: Math.floor((video.height - height) / 2),
    width,
    height,
  }
}

/** Digital zoom range that keeps the crop's long edge at or above the card floor. */
export function digitalZoomRange(video: ImageSize): ZoomRange {
  const rect = cardCaptureRect(video, 1)
  if (!rect) return { min: 1, max: 1 }
  const longEdge = Math.max(rect.width, rect.height)
  return {
    min: 1,
    max: clamp(longEdge / CARD_CROP_FRAME.minSourceEdgePx, 1, CARD_CROP_FRAME.maxZoom),
  }
}

/** Usable hardware zoom range, or null when the track has none. */
export function nativeZoomRange(
  capability: { min?: number; max?: number } | undefined,
): ZoomRange | null {
  const min = capability?.min
  const max = capability?.max
  if (min === undefined || max === undefined) return null
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return null
  return { min, max: Math.min(max, min * VIEWFINDER_NATIVE_ZOOM_SPAN) }
}

/** Clamps a zoom to the range; NaN gives the range min. */
export function clampZoom(value: number, range: ZoomRange): number {
  return Number.isFinite(value) ? clamp(value, range.min, range.max) : range.min
}

/** Zoom after a pinch that went from `startDistance` to `distance` px. */
export function pinchZoom(
  startZoom: number,
  startDistance: number,
  distance: number,
  range: ZoomRange,
): number {
  if (!(startDistance > 0) || !Number.isFinite(distance)) return clampZoom(startZoom, range)
  return clampZoom(startZoom * (distance / startDistance), range)
}

/** Output canvas size for a capture rect, capped at `maxEdge` on the long side. */
export function captureOutputSize(rect: PixelRect, maxEdge: number): ImageSize {
  const scale = Math.min(1, maxEdge / Math.max(rect.width, rect.height))
  return {
    width: Math.max(1, Math.round(rect.width * scale)),
    height: Math.max(1, Math.round(rect.height * scale)),
  }
}

/** Maps a tap normalized on the 63:88 frame to a point normalized on the video frame. */
export function viewfinderPoint(
  tap: NormalizedPoint,
  video: ImageSize,
  zoom: number,
  isMirrored: boolean,
): NormalizedPoint {
  const size = cropSize(video, zoom)
  if (!size) return { x: 0.5, y: 0.5 }
  const tx = isMirrored ? 1 - tap.x : tap.x
  return {
    x: clamp(((video.width - size.width) / 2 + tx * size.width) / video.width, 0, 1),
    y: clamp(((video.height - size.height) / 2 + tap.y * size.height) / video.height, 0, 1),
  }
}

/** Classifies a getUserMedia rejection by its DOMException name. */
export function classifyCameraError(name: string): CameraFailure {
  return CAMERA_FAILURES.get(name) ?? 'failed'
}
