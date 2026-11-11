import { useCallback, useEffect, useRef, useState } from 'react'
import { useCameraStream } from '@/features/uploads/camera/use-camera-stream'
import type { CameraStream } from '@/features/uploads/camera/camera-types'

export type MomentStep = 'back' | 'front' | 'preview'

export interface MomentShot {
  file: File
  url: string
}

export interface MomentCapture {
  step: MomentStep
  camera: CameraStream
  back: MomentShot | null
  front: MomentShot | null
  countdown: number | null
  shoot(): void
  retake(): void
}

const SELFIE_COUNTDOWN = 3

function toShot(file: File): MomentShot {
  return { file, url: URL.createObjectURL(file) }
}

/** Drives the sequential two-camera capture: back photo, then the selfie after a 3-2-1, then the preview. */
export function useMomentCapture(isActive: boolean): MomentCapture {
  const [step, setStep] = useState<MomentStep>('back')
  const [back, setBack] = useState<MomentShot | null>(null)
  const [front, setFront] = useState<MomentShot | null>(null)
  const [countdown, setCountdown] = useState<number | null>(null)
  const camera = useCameraStream(isActive && step !== 'preview')
  const isShootingRef = useRef(false)
  const shotsRef = useRef<MomentShot[]>([])

  useEffect(
    () => () => {
      for (const shot of shotsRef.current) URL.revokeObjectURL(shot.url)
    },
    [],
  )

  const keep = useCallback((file: File): MomentShot => {
    const shot = toShot(file)
    shotsRef.current = [...shotsRef.current, shot]
    return shot
  }, [])

  const shoot = useCallback(() => {
    if (isShootingRef.current || camera.phase !== 'live') return
    isShootingRef.current = true
    setCountdown(null)
    void camera
      .capture()
      .then((file) => {
        if (file === null) return
        if (step === 'back') {
          setBack(keep(file))
          setStep('front')
          if (camera.canFlip && camera.facing === 'environment') camera.flip()
        } else if (step === 'front') {
          setFront(keep(file))
          setStep('preview')
        }
      })
      .finally(() => {
        isShootingRef.current = false
      })
  }, [camera, keep, step])

  const isSelfieReady =
    step === 'front' &&
    camera.phase === 'live' &&
    (camera.facing === 'user' || !camera.canFlip) &&
    front === null

  const shootRef = useRef(shoot)
  useEffect(() => {
    shootRef.current = shoot
  }, [shoot])

  useEffect(() => {
    if (!isSelfieReady) return
    let remaining = SELFIE_COUNTDOWN
    let timer = 0
    const tick = (): void => {
      setCountdown(remaining)
      if (remaining === 0) {
        shootRef.current()
        return
      }
      remaining -= 1
      timer = window.setTimeout(tick, 1000)
    }
    timer = window.setTimeout(tick, 0)
    return () => window.clearTimeout(timer)
  }, [isSelfieReady])

  const needsBackCamera =
    step === 'back' && camera.phase === 'live' && camera.facing === 'user' && camera.canFlip
  const { flip } = camera

  useEffect(() => {
    if (needsBackCamera) flip()
  }, [needsBackCamera, flip])

  const retake = useCallback(() => {
    setBack(null)
    setFront(null)
    setCountdown(null)
    setStep('back')
  }, [])

  return { step, camera, back, front, countdown, shoot, retake }
}
