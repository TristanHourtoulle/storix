import type { NormalizedPoint, ZoomRange } from '@storix/shared/domain'
import type { CameraFacing } from './camera-stream'

export type CameraPhase =
  'off' | 'priming' | 'starting' | 'live' | 'paused' | 'denied' | 'busy' | 'unavailable'

export interface CameraZoomState {
  mode: 'native' | 'digital'
  range: ZoomRange
  value: number
}

export interface CameraStream {
  phase: CameraPhase
  canRetry: boolean
  facing: CameraFacing
  isMirrored: boolean
  canFlip: boolean
  zoom: CameraZoomState | null
  isFlashing: boolean
  shutterTick: number
  videoRef: (node: HTMLVideoElement | null) => void
  enable(): void
  flip(): void
  setZoom(value: number): void
  focusAt(tap: NormalizedPoint): void
  capture(): Promise<File | null>
}
