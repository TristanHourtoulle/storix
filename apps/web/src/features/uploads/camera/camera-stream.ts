import {
  classifyCameraError,
  clampZoom,
  nativeZoomRange,
  type CameraFailure,
  type NormalizedPoint,
  type ZoomRange,
} from '@storix/shared/domain'
import { logger } from '@/lib/logger'

export type CameraFacing = 'environment' | 'user'

export interface ViewfinderConstraintSet {
  zoom?: number
  focusMode?: string
  pointsOfInterest?: readonly NormalizedPoint[]
}

export interface CameraCapabilities {
  zoom: ZoomRange | null
  canFocusAtPoint: boolean
  hasContinuousFocus: boolean
}

type CameraConstraintSet = MediaTrackConstraintSet & ViewfinderConstraintSet

const IDEAL_SIZE = { width: { ideal: 1920 }, height: { ideal: 1440 } } as const
const CONTINUOUS_FOCUS_DELAY_MS = 2000
const NO_CAPABILITIES: CameraCapabilities = {
  zoom: null,
  canFocusAtPoint: false,
  hasContinuousFocus: false,
}

/** A getUserMedia rejection, classified. */
export class CameraOpenError extends Error {
  readonly kind: CameraFailure

  constructor(kind: CameraFailure) {
    super(`Camera could not be opened: ${kind}`)
    this.name = 'CameraOpenError'
    this.kind = kind
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function numberField(record: Record<string, unknown>, key: string): number | undefined {
  const value = record[key]
  return typeof value === 'number' ? value : undefined
}

function stringList(value: unknown): readonly string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : []
}

function errorName(error: unknown): string {
  return isRecord(error) && typeof error.name === 'string' ? error.name : ''
}

function constraintLadder(request: {
  facing: CameraFacing
  deviceId?: string
}): readonly MediaTrackConstraints[] {
  const target: MediaTrackConstraints = request.deviceId
    ? { deviceId: { exact: request.deviceId } }
    : { facingMode: { ideal: request.facing } }
  const relaxed: MediaTrackConstraints = request.deviceId
    ? { deviceId: { exact: request.deviceId } }
    : { facingMode: request.facing }
  return [{ ...target, ...IDEAL_SIZE }, relaxed]
}

/** True when getUserMedia exists in a secure context. */
export function isCameraSupported(): boolean {
  return (
    window.isSecureContext &&
    typeof navigator.mediaDevices === 'object' &&
    typeof navigator.mediaDevices.getUserMedia === 'function'
  )
}

/** Opens the camera with the V1 constraint ladder; rejects with CameraOpenError. */
export async function openCameraStream(request: {
  facing: CameraFacing
  deviceId?: string
}): Promise<MediaStream> {
  const attempts: readonly (MediaTrackConstraints | true)[] = [...constraintLadder(request), true]
  for (const video of attempts) {
    try {
      return await navigator.mediaDevices.getUserMedia({ audio: false, video })
    } catch (error) {
      const kind = classifyCameraError(errorName(error))
      if (kind !== 'overconstrained') throw new CameraOpenError(kind)
    }
  }
  throw new CameraOpenError('unavailable')
}

/** Stops every track of the stream. */
export function stopStream(stream: MediaStream | null): void {
  stream?.getTracks().forEach((track) => track.stop())
}

function supportsPointsOfInterest(): boolean {
  try {
    const supported: unknown = navigator.mediaDevices.getSupportedConstraints()
    return isRecord(supported) && supported.pointsOfInterest === true
  } catch {
    return false
  }
}

/** Reads zoom and focus support from the track, narrowing getCapabilities() from unknown. */
export function readCapabilities(track: MediaStreamTrack): CameraCapabilities {
  const getCapabilities: unknown = Reflect.get(track, 'getCapabilities')
  if (typeof getCapabilities !== 'function') return NO_CAPABILITIES
  let raw: unknown
  try {
    raw = track.getCapabilities()
  } catch {
    return NO_CAPABILITIES
  }
  if (!isRecord(raw)) return NO_CAPABILITIES
  const zoom = isRecord(raw.zoom)
    ? nativeZoomRange({ min: numberField(raw.zoom, 'min'), max: numberField(raw.zoom, 'max') })
    : null
  const focusModes = stringList(raw.focusMode)
  return {
    zoom,
    canFocusAtPoint: supportsPointsOfInterest() && focusModes.includes('single-shot'),
    hasContinuousFocus: focusModes.includes('continuous'),
  }
}

/** Applies a hardware zoom, clamped to the track's usable range. */
export function applyNativeZoom(track: MediaStreamTrack, zoom: number): Promise<void> {
  const range = readCapabilities(track).zoom
  if (!range) return Promise.reject(new Error('Camera has no hardware zoom'))
  const set: CameraConstraintSet = { zoom: clampZoom(zoom, range) }
  return track.applyConstraints({ advanced: [set] })
}

/** Applies single-shot focus at the point, then returns to continuous after 2 s; resolves false when unsupported or rejected. */
export async function focusAtPoint(
  track: MediaStreamTrack,
  caps: CameraCapabilities,
  point: NormalizedPoint,
): Promise<boolean> {
  if (!caps.canFocusAtPoint) return false
  const set: CameraConstraintSet = { pointsOfInterest: [point], focusMode: 'single-shot' }
  try {
    await track.applyConstraints({ advanced: [set] })
  } catch (error) {
    logger.warn('Camera focus rejected', { name: errorName(error) })
    return false
  }
  if (caps.hasContinuousFocus) {
    window.setTimeout(() => {
      if (track.readyState !== 'live') return
      const continuous: CameraConstraintSet = { focusMode: 'continuous' }
      track.applyConstraints({ advanced: [continuous] }).catch((error: unknown) => {
        logger.warn('Camera focus rejected', { name: errorName(error) })
      })
    }, CONTINUOUS_FOCUS_DELAY_MS)
  }
  return true
}

/** Lists the video inputs, or none when the browser refuses. */
export async function listVideoInputs(): Promise<readonly MediaDeviceInfo[]> {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices()
    return devices.filter((device) => device.kind === 'videoinput')
  } catch (error) {
    logger.warn('Camera listing failed', { name: errorName(error) })
    return []
  }
}
