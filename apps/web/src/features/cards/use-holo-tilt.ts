import { useCallback, useEffect, useState, type RefCallback } from 'react'
import { logger } from '@/lib/logger'

const MAX_TILT_DEG = 12
const MAX_ORIENTATION_DEG = 30
const REST_BETA_DEG = 45
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'
const VARIABLES = ['--rx', '--ry', '--mx', '--my', '--glare'] as const

interface TiltSample {
  rx: number
  ry: number
  mx: number
  my: number
  glare: number
}

type PermissionState = 'granted' | 'denied'
type PermissionRequester = { requestPermission: () => Promise<PermissionState> }

interface HoloTilt {
  ref: RefCallback<HTMLElement>
  needsMotionPermission: boolean
  isMotionDenied: boolean
  requestMotionPermission: () => Promise<void>
}

function clamp(value: number, limit: number): number {
  return Math.max(-limit, Math.min(limit, value))
}

function getPermissionRequester(): PermissionRequester | null {
  if (typeof DeviceOrientationEvent === 'undefined') return null
  if (
    'requestPermission' in DeviceOrientationEvent &&
    typeof DeviceOrientationEvent.requestPermission === 'function'
  ) {
    return DeviceOrientationEvent as unknown as PermissionRequester
  }
  return null
}

function sampleFromFraction(x: number, y: number): TiltSample {
  const fx = Math.min(1, Math.max(0, x))
  const fy = Math.min(1, Math.max(0, y))
  return {
    rx: -(fy - 0.5) * 2 * MAX_TILT_DEG,
    ry: (fx - 0.5) * 2 * MAX_TILT_DEG,
    mx: fx * 100,
    my: fy * 100,
    glare: 1,
  }
}

function sampleFromOrientation(gamma: number, beta: number): TiltSample {
  const ry = (clamp(gamma, MAX_ORIENTATION_DEG) / MAX_ORIENTATION_DEG) * MAX_TILT_DEG
  const rx =
    -(clamp(beta - REST_BETA_DEG, MAX_ORIENTATION_DEG) / MAX_ORIENTATION_DEG) * MAX_TILT_DEG
  return {
    rx,
    ry,
    mx: 50 + (ry / MAX_TILT_DEG) * 50,
    my: 50 - (rx / MAX_TILT_DEG) * 50,
    glare: 1,
  }
}

/** Drives card tilt and holo CSS variables from pointer and device orientation without React state per frame. */
export function useHoloTilt(): HoloTilt {
  const [element, setElement] = useState<HTMLElement | null>(null)
  const [isPermissionPending, setIsPermissionPending] = useState(
    () => getPermissionRequester() !== null,
  )
  const [isMotionDenied, setIsMotionDenied] = useState(false)
  const [isReducedMotion, setIsReducedMotion] = useState(
    () => window.matchMedia(REDUCED_MOTION_QUERY).matches,
  )
  const needsMotionPermission = isPermissionPending && !isMotionDenied && !isReducedMotion

  useEffect(() => {
    const query = window.matchMedia(REDUCED_MOTION_QUERY)
    const handleChange = (event: MediaQueryListEvent) => setIsReducedMotion(event.matches)
    query.addEventListener('change', handleChange)
    return () => query.removeEventListener('change', handleChange)
  }, [])

  const ref = useCallback<RefCallback<HTMLElement>>((node) => setElement(node), [])

  const requestMotionPermission = useCallback(async () => {
    const requester = getPermissionRequester()
    if (!requester) return
    try {
      const result = await requester.requestPermission()
      if (result === 'granted') setIsPermissionPending(false)
      else setIsMotionDenied(true)
    } catch (error) {
      logger.warn('Motion permission request failed', { error })
    }
  }, [])

  useEffect(() => {
    if (!element) return
    const target = element
    if (isReducedMotion) return

    let latest: TiltSample | null = null
    let frame = 0
    let isOrientationAttached = false
    let rect: DOMRect | null = null

    function invalidateRect() {
      rect = null
    }

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
      if (frame !== 0) cancelAnimationFrame(frame)
      frame = 0
      for (const name of VARIABLES) target.style.removeProperty(name)
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
      schedule(sampleFromOrientation(event.gamma, event.beta))
    }

    function attachOrientation() {
      if (isOrientationAttached || isPermissionPending) return
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
    target.addEventListener('pointermove', handlePointerMove, passive)
    target.addEventListener('pointerleave', reset, passive)
    window.addEventListener('resize', invalidateRect, passive)
    window.addEventListener('scroll', invalidateRect, passive)
    document.addEventListener('visibilitychange', handleVisibility)
    if (!document.hidden) attachOrientation()

    return () => {
      target.removeEventListener('pointerenter', invalidateRect)
      target.removeEventListener('pointermove', handlePointerMove)
      target.removeEventListener('pointerleave', reset)
      window.removeEventListener('resize', invalidateRect)
      window.removeEventListener('scroll', invalidateRect)
      document.removeEventListener('visibilitychange', handleVisibility)
      detachOrientation()
      reset()
    }
  }, [element, isPermissionPending, isReducedMotion])

  return { ref, needsMotionPermission, isMotionDenied, requestMotionPermission }
}
