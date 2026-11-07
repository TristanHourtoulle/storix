import { useCallback, useEffect, useState, type RefCallback } from 'react'
import { logger } from '@/lib/logger'
import {
  getPermissionRequester,
  readMotionPermission,
  rememberMotionPermission,
  type MotionPermission,
} from './motion-permission'
import {
  readScreenAngle,
  sampleFromFraction,
  sampleFromOrientation,
  type TiltSample,
} from './tilt-math'

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'
const COARSE_POINTER_QUERY = '(pointer: coarse)'
const STALE_GRANT_DELAY_MS = 1500
const VARIABLES = ['--rx', '--ry', '--mx', '--my', '--glare'] as const

interface HoloTilt {
  ref: RefCallback<HTMLElement>
  isDragTilt: boolean
  needsMotionPermission: boolean
  isMotionDenied: boolean
  requestMotionPermission: () => void
}

/** Drives card tilt and holo CSS variables from device orientation, falling back to pointer and touch drag. */
export function useHoloTilt(): HoloTilt {
  const [element, setElement] = useState<HTMLElement | null>(null)
  const [permission, setPermission] = useState<MotionPermission>(readMotionPermission)
  const [isReceiving, setIsReceiving] = useState(false)
  const [isReducedMotion, setIsReducedMotion] = useState(
    () => window.matchMedia(REDUCED_MOTION_QUERY).matches,
  )
  const [isCoarsePointer] = useState(() => window.matchMedia(COARSE_POINTER_QUERY).matches)

  const isOrientationBlocked = isReducedMotion || permission === 'denied'
  const needsMotionPermission =
    permission === 'prompt' && !isReceiving && !isReducedMotion && isCoarsePointer
  const isMotionDenied = permission === 'denied' && !isReducedMotion && isCoarsePointer

  useEffect(() => {
    const query = window.matchMedia(REDUCED_MOTION_QUERY)
    const handleChange = (event: MediaQueryListEvent) => setIsReducedMotion(event.matches)
    query.addEventListener('change', handleChange)
    return () => query.removeEventListener('change', handleChange)
  }, [])

  useEffect(() => {
    if (permission !== 'granted' || isReceiving || isReducedMotion) return
    const timer = window.setTimeout(() => setPermission('prompt'), STALE_GRANT_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [permission, isReceiving, isReducedMotion])

  const ref = useCallback<RefCallback<HTMLElement>>((node) => setElement(node), [])

  const requestMotionPermission = useCallback(() => {
    const requester = getPermissionRequester()
    if (!requester) return
    requester.requestPermission().then(
      (result) => {
        rememberMotionPermission(result)
        setPermission(result)
      },
      (error: unknown) => logger.warn('Motion permission request failed', { error }),
    )
  }, [])

  useEffect(() => {
    if (!element) return
    const target = element

    let latest: TiltSample | null = null
    let frame = 0
    let rect: DOMRect | null = null
    let isOrientationAttached = false
    let hasReceived = false
    let isTouchDragging = false

    function flush() {
      frame = 0
      if (!latest) return
      const style = target.style
      style.setProperty('--rx', `${latest.rx.toFixed(2)}deg`)
      style.setProperty('--ry', `${latest.ry.toFixed(2)}deg`)
      style.setProperty('--mx', `${latest.mx.toFixed(1)}%`)
      style.setProperty('--my', `${latest.my.toFixed(1)}%`)
      style.setProperty('--glare', latest.glare.toFixed(2))
    }

    function schedule(sample: TiltSample) {
      latest = sample
      if (frame === 0) frame = requestAnimationFrame(flush)
    }

    function reset() {
      latest = null
      isTouchDragging = false
      if (frame !== 0) cancelAnimationFrame(frame)
      frame = 0
      for (const name of VARIABLES) target.style.removeProperty(name)
    }

    function invalidateRect() {
      rect = null
    }

    function handlePointerDown(event: PointerEvent) {
      rect = null
      if (event.pointerType === 'touch') isTouchDragging = true
      handlePointerMove(event)
    }

    function handlePointerEnd() {
      isTouchDragging = false
    }

    function handlePointerMove(event: PointerEvent) {
      rect ??= target.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return
      schedule(
        sampleFromFraction(
          (event.clientX - rect.left) / rect.width,
          (event.clientY - rect.top) / rect.height,
        ),
      )
    }

    function handleOrientation(event: DeviceOrientationEvent) {
      if (event.gamma === null || event.beta === null) return
      if (!hasReceived) {
        hasReceived = true
        setIsReceiving(true)
        if (getPermissionRequester()) {
          rememberMotionPermission('granted')
          setPermission('granted')
        }
      }
      if (isTouchDragging) return
      schedule(sampleFromOrientation(event.gamma, event.beta, readScreenAngle()))
    }

    function attachOrientation() {
      if (isOrientationAttached || isOrientationBlocked) return
      window.addEventListener('deviceorientation', handleOrientation)
      isOrientationAttached = true
    }

    function detachOrientation() {
      if (!isOrientationAttached) return
      window.removeEventListener('deviceorientation', handleOrientation)
      isOrientationAttached = false
    }

    function handleVisibility() {
      if (document.hidden) {
        detachOrientation()
        if (frame !== 0) cancelAnimationFrame(frame)
        frame = 0
      } else {
        attachOrientation()
      }
    }

    const passive = { passive: true } as const
    target.addEventListener('pointerenter', invalidateRect, passive)
    target.addEventListener('pointerdown', handlePointerDown, passive)
    target.addEventListener('pointermove', handlePointerMove, passive)
    target.addEventListener('pointerup', handlePointerEnd, passive)
    target.addEventListener('pointercancel', reset, passive)
    target.addEventListener('pointerleave', reset, passive)
    window.addEventListener('resize', invalidateRect, passive)
    window.addEventListener('scroll', invalidateRect, passive)
    document.addEventListener('visibilitychange', handleVisibility)
    if (!document.hidden) attachOrientation()

    return () => {
      target.removeEventListener('pointerenter', invalidateRect)
      target.removeEventListener('pointerdown', handlePointerDown)
      target.removeEventListener('pointermove', handlePointerMove)
      target.removeEventListener('pointerup', handlePointerEnd)
      target.removeEventListener('pointercancel', reset)
      target.removeEventListener('pointerleave', reset)
      window.removeEventListener('resize', invalidateRect)
      window.removeEventListener('scroll', invalidateRect)
      document.removeEventListener('visibilitychange', handleVisibility)
      detachOrientation()
      reset()
    }
  }, [element, isOrientationBlocked])

  return {
    ref,
    isDragTilt: !isReceiving || isOrientationBlocked,
    needsMotionPermission,
    isMotionDenied,
    requestMotionPermission,
  }
}
