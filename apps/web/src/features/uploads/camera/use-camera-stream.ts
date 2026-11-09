import { useCallback, useEffect, useRef, useState } from 'react'
import {
  clampZoom,
  digitalZoomRange,
  viewfinderPoint,
  type NormalizedPoint,
} from '@storix/shared/domain'
import { logger } from '@/lib/logger'
import {
  CameraOpenError,
  applyNativeZoom,
  focusAtPoint,
  isCameraSupported,
  listVideoInputs,
  openCameraStream,
  readCapabilities,
  stopStream,
  type CameraCapabilities,
  type CameraFacing,
} from './camera-stream'
import {
  forgetGranted,
  hasGrantedBefore,
  queryCameraPermission,
  rememberGranted,
} from './camera-permission'
import {
  attachStream,
  delay,
  nextAnimationFrame,
  settingsZoom,
  waitForFirstFrame,
} from './camera-video'
import { captureFrame } from './capture'
import type { CameraPhase, CameraStream, CameraZoomState } from './camera-types'
import { usePageVisibility } from './use-page-visibility'

export type { CameraPhase, CameraStream, CameraZoomState } from './camera-types'

interface StartRequest {
  facing: CameraFacing
  deviceId?: string
  previousDeviceId?: string
  isRecovery?: boolean
}

const FLASH_SETTLE_MS = 120
const RESTART_BUDGET = 1
const RETRYABLE_PHASES: ReadonlySet<CameraPhase> = new Set(['denied', 'busy', 'unavailable'])

/** Live camera for the add screen: starts while `isWanted`, stops on leave, hide and page hide (V10–V12, V15). */
export function useCameraStream(isWanted: boolean): CameraStream {
  const [phase, setPhaseState] = useState<CameraPhase>(isWanted ? 'starting' : 'off')
  const [canRetry, setCanRetry] = useState(false)
  const [facing, setFacing] = useState<CameraFacing>('environment')
  const [isMirrored, setIsMirrored] = useState(false)
  const [canFlip, setCanFlip] = useState(false)
  const [zoom, setZoomState] = useState<CameraZoomState | null>(null)
  const [isFlashing, setIsFlashing] = useState(false)
  const [shutterTick, setShutterTick] = useState(0)

  const streamRef = useRef<MediaStream | null>(null)
  const videoNodeRef = useRef<HTMLVideoElement | null>(null)
  const generationRef = useRef(0)
  const wasLiveRef = useRef(false)
  const capsRef = useRef<CameraCapabilities | null>(null)
  const restartsRef = useRef(0)
  const zoomFrameRef = useRef<number | null>(null)
  const pendingZoomRef = useRef<number | null>(null)
  const hasWarnedZoomRef = useRef(false)
  const endedCleanupRef = useRef<(() => void) | null>(null)
  const isMountedRef = useRef(false)
  const isWantedRef = useRef(isWanted)
  const phaseRef = useRef<CameraPhase>(phase)
  const facingRef = useRef<CameraFacing>('environment')
  const isMirroredRef = useRef(false)
  const deviceIdRef = useRef<string | undefined>(undefined)
  const zoomRef = useRef<CameraZoomState | null>(null)

  const setPhase = useCallback((next: CameraPhase, retry = false): void => {
    phaseRef.current = next
    setPhaseState(next)
    setCanRetry(retry)
  }, [])

  const updateZoom = useCallback((next: CameraZoomState | null): void => {
    zoomRef.current = next
    setZoomState(next)
  }, [])

  const release = useCallback((): void => {
    endedCleanupRef.current?.()
    endedCleanupRef.current = null
    if (zoomFrameRef.current !== null) cancelAnimationFrame(zoomFrameRef.current)
    zoomFrameRef.current = null
    stopStream(streamRef.current)
    streamRef.current = null
    capsRef.current = null
    if (videoNodeRef.current) videoNodeRef.current.srcObject = null
  }, [])

  const isStale = useCallback(
    (generation: number): boolean =>
      generation !== generationRef.current || !isMountedRef.current || !isWantedRef.current,
    [],
  )

  const fail = useCallback(
    (error: unknown): void => {
      const kind = error instanceof CameraOpenError ? error.kind : 'failed'
      logger.warn('Camera start failed', { kind })
      if (kind === 'denied') {
        forgetGranted()
        setPhase('denied', true)
      } else if (kind === 'busy') setPhase('busy', true)
      else setPhase('unavailable', kind === 'failed')
    },
    [setPhase],
  )

  const start = useCallback(
    async function run(request: StartRequest): Promise<void> {
      const generation = ++generationRef.current
      release()
      updateZoom(null)
      if (!request.isRecovery) restartsRef.current = 0
      facingRef.current = request.facing
      setFacing(request.facing)
      setPhase('starting')
      let stream: MediaStream
      try {
        stream = await openCameraStream(request)
      } catch (error) {
        if (!isStale(generation)) fail(error)
        return
      }
      if (isStale(generation)) {
        stopStream(stream)
        return
      }
      const track = stream.getVideoTracks()[0]
      if (!track) {
        stopStream(stream)
        fail(new CameraOpenError('unavailable'))
        return
      }
      const settings = track.getSettings()
      const isWrongCamera =
        request.previousDeviceId !== undefined &&
        request.deviceId === undefined &&
        (settings.facingMode !== undefined
          ? settings.facingMode !== request.facing
          : settings.deviceId === request.previousDeviceId)
      if (isWrongCamera) {
        const inputs = await listVideoInputs()
        if (isStale(generation)) {
          stopStream(stream)
          return
        }
        const index = inputs.findIndex((input) => input.deviceId === request.previousDeviceId)
        const next = inputs[(index + 1) % Math.max(inputs.length, 1)]
        if (next?.deviceId && next.deviceId !== request.previousDeviceId) {
          stopStream(stream)
          await run({ ...request, deviceId: next.deviceId })
          return
        }
      }
      streamRef.current = stream
      deviceIdRef.current = settings.deviceId
      const caps = readCapabilities(track)
      capsRef.current = caps
      const mirrored = (settings.facingMode ?? request.facing) === 'user'
      isMirroredRef.current = mirrored
      setIsMirrored(mirrored)
      if (caps.zoom) {
        updateZoom({ mode: 'native', range: caps.zoom, value: caps.zoom.min })
        const current = settingsZoom(settings)
        if (current !== null && current !== caps.zoom.min) {
          applyNativeZoom(track, caps.zoom.min).catch(() => undefined)
        }
      }
      const onEnded = (): void => {
        if (isStale(generation) || document.visibilityState !== 'visible') return
        if (restartsRef.current < RESTART_BUDGET) {
          restartsRef.current += 1
          void run({ facing: facingRef.current, isRecovery: true })
        } else {
          release()
          setPhase('unavailable', true)
        }
      }
      track.addEventListener('ended', onEnded)
      endedCleanupRef.current = () => track.removeEventListener('ended', onEnded)
      const video = videoNodeRef.current
      if (video) attachStream(video, stream)
      rememberGranted()
      setPhase('live')
      void listVideoInputs().then((inputs) => {
        if (!isStale(generation)) setCanFlip(inputs.length >= 2)
      })
      if (!video) return
      const hasFrame = await waitForFirstFrame(video)
      if (isStale(generation) || streamRef.current !== stream) return
      if (hasFrame) {
        restartsRef.current = 0
        if (!caps.zoom) {
          const range = digitalZoomRange({ width: video.videoWidth, height: video.videoHeight })
          updateZoom(range.max > 1 ? { mode: 'digital', range, value: range.min } : null)
        }
        return
      }
      if (restartsRef.current < RESTART_BUDGET) {
        restartsRef.current += 1
        await run({ facing: facingRef.current, isRecovery: true })
        return
      }
      release()
      setPhase('unavailable', true)
    },
    [fail, isStale, release, setPhase, updateZoom],
  )

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      generationRef.current += 1
      release()
    }
  }, [release])

  useEffect(() => {
    isWantedRef.current = isWanted
    const generation = ++generationRef.current
    if (!isWanted) {
      release()
      wasLiveRef.current = false
      setPhase('off')
      return
    }
    void (async () => {
      if (!isCameraSupported()) {
        setPhase('unavailable')
        return
      }
      if (hasGrantedBefore()) {
        await start({ facing: facingRef.current })
        return
      }
      setPhase('starting')
      const permission = await queryCameraPermission()
      if (isStale(generation)) return
      if (permission === 'granted') await start({ facing: facingRef.current })
      else if (permission === 'denied') setPhase('denied', true)
      else setPhase('priming')
    })()
  }, [isWanted, isStale, release, setPhase, start])

  const pause = useCallback((): void => {
    if (phaseRef.current !== 'live' && phaseRef.current !== 'starting') return
    generationRef.current += 1
    release()
    wasLiveRef.current = true
    setPhase('paused')
  }, [release, setPhase])

  const resume = useCallback((): void => {
    if (phaseRef.current !== 'paused' || !wasLiveRef.current || !isWantedRef.current) return
    wasLiveRef.current = false
    void start({ facing: facingRef.current })
  }, [start])

  usePageVisibility({ onHide: pause, onShow: resume })

  const videoRef = useCallback((node: HTMLVideoElement | null): void => {
    videoNodeRef.current = node
    if (!node) return
    node.muted = true
    node.setAttribute('playsinline', '')
    const stream = streamRef.current
    if (stream && node.srcObject !== stream) attachStream(node, stream)
  }, [])

  const enable = useCallback((): void => {
    const current = phaseRef.current
    const isRetry = RETRYABLE_PHASES.has(current) && canRetry
    if (current !== 'priming' && current !== 'paused' && !isRetry) return
    if (!isCameraSupported()) return
    wasLiveRef.current = false
    void start({ facing: facingRef.current })
  }, [canRetry, start])

  const flip = useCallback((): void => {
    if (phaseRef.current !== 'live' && phaseRef.current !== 'starting') return
    const next: CameraFacing = facingRef.current === 'environment' ? 'user' : 'environment'
    void start({ facing: next, previousDeviceId: deviceIdRef.current })
  }, [start])

  const switchToDigital = useCallback(
    (error: unknown): void => {
      if (!hasWarnedZoomRef.current) {
        hasWarnedZoomRef.current = true
        logger.warn('Camera zoom rejected', {
          name: error instanceof Error ? error.name : 'UnknownError',
        })
      }
      if (capsRef.current) capsRef.current = { ...capsRef.current, zoom: null }
      const video = videoNodeRef.current
      const range = video
        ? digitalZoomRange({ width: video.videoWidth, height: video.videoHeight })
        : { min: 1, max: 1 }
      updateZoom(range.max > 1 ? { mode: 'digital', range, value: range.min } : null)
    },
    [updateZoom],
  )

  const setZoom = useCallback(
    (value: number): void => {
      const current = zoomRef.current
      if (!current) return
      const next = clampZoom(value, current.range)
      updateZoom({ ...current, value: next })
      if (current.mode !== 'native') return
      pendingZoomRef.current = next
      if (zoomFrameRef.current !== null) return
      zoomFrameRef.current = requestAnimationFrame(() => {
        zoomFrameRef.current = null
        const track = streamRef.current?.getVideoTracks()[0]
        const pending = pendingZoomRef.current
        if (!track || pending === null || zoomRef.current?.mode !== 'native') return
        applyNativeZoom(track, pending).catch(switchToDigital)
      })
    },
    [switchToDigital, updateZoom],
  )

  const focusAt = useCallback((tap: NormalizedPoint): void => {
    const track = streamRef.current?.getVideoTracks()[0]
    const caps = capsRef.current
    const video = videoNodeRef.current
    if (!track || !caps?.canFocusAtPoint || !video) return
    const digital = zoomRef.current?.mode === 'digital' ? zoomRef.current.value : 1
    const point = viewfinderPoint(
      tap,
      { width: video.videoWidth, height: video.videoHeight },
      digital,
      isMirroredRef.current,
    )
    void focusAtPoint(track, caps, point)
  }, [])

  const capture = useCallback(async (): Promise<File | null> => {
    const video = videoNodeRef.current
    if (phaseRef.current !== 'live' || !video) return null
    const digital = zoomRef.current?.mode === 'digital' ? zoomRef.current.value : 1
    const isFront = isMirroredRef.current
    const stream = streamRef.current
    try {
      if (isFront) {
        setIsFlashing(true)
        await nextAnimationFrame()
        await nextAnimationFrame()
        await delay(FLASH_SETTLE_MS)
      }
      if (streamRef.current !== stream || phaseRef.current !== 'live') return null
      const file = await captureFrame(video, digital)
      if (file) setShutterTick((tick) => tick + 1)
      return file
    } catch (error) {
      logger.warn('Camera capture failed', {
        name: error instanceof Error ? error.name : 'UnknownError',
      })
      return null
    } finally {
      if (isFront) setIsFlashing(false)
    }
  }, [])

  return {
    phase: isWanted ? phase : 'off',
    canRetry,
    facing,
    isMirrored,
    canFlip,
    zoom,
    isFlashing,
    shutterTick,
    videoRef,
    enable,
    flip,
    setZoom,
    focusAt,
    capture,
  }
}
