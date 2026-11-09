import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Notice } from '@/components/ui/notice'
import { isIos } from '@/lib/platform'
import { CAMERA_COPY, zoomLabel } from '../camera/camera-copy'
import type { CameraStream } from '../camera/camera-types'
import { useViewfinderGestures } from '../camera/use-viewfinder-gestures'
import { ViewfinderPanel } from './viewfinder-panel'

export interface ViewfinderProps {
  camera: CameraStream
  block: 'quota' | 'batch' | null
  blockedNotice: { title: string; body: string } | null
  overflowNotice: string | null
}

interface FocusRing {
  id: number
  x: number
  y: number
}

const FOCUS_RING_MS = 700

const CORNERS = [
  'left-0 top-0 rounded-tl-[14px] border-b-0 border-r-0',
  'right-0 top-0 rounded-tr-[14px] border-b-0 border-l-0',
  'bottom-0 left-0 rounded-bl-[14px] border-r-0 border-t-0',
  'bottom-0 right-0 rounded-br-[14px] border-l-0 border-t-0',
] as const

function StatePanel({ camera, block, blockedNotice }: Omit<ViewfinderProps, 'overflowNotice'>) {
  const retry = camera.canRetry ? { label: CAMERA_COPY.retry, onClick: camera.enable } : undefined
  if (block) return blockedNotice ? <ViewfinderPanel {...blockedNotice} /> : null
  switch (camera.phase) {
    case 'priming':
      return (
        <ViewfinderPanel
          title={CAMERA_COPY.primingTitle}
          body={CAMERA_COPY.primingBody}
          action={{ label: CAMERA_COPY.primingAction, onClick: camera.enable }}
        />
      )
    case 'starting':
      return <div className="absolute inset-0 animate-pulse bg-surface-2/60" />
    case 'paused':
      return (
        <ViewfinderPanel
          title={CAMERA_COPY.pausedTitle}
          body=""
          action={{ label: CAMERA_COPY.resume, onClick: camera.enable }}
        />
      )
    case 'denied':
      return (
        <ViewfinderPanel
          title={CAMERA_COPY.deniedTitle}
          body={`${isIos() ? CAMERA_COPY.deniedBodyIos : CAMERA_COPY.deniedBodyOther}\n${CAMERA_COPY.fallbackLine}`}
          action={retry}
        />
      )
    case 'busy':
      return (
        <ViewfinderPanel
          title={CAMERA_COPY.busyTitle}
          body={`${CAMERA_COPY.busyBody}\n${CAMERA_COPY.fallbackLine}`}
          action={retry}
        />
      )
    case 'unavailable':
      return <ViewfinderPanel body={CAMERA_COPY.unavailableBody} action={retry} />
    default:
      return null
  }
}

/** The live 63:88 viewfinder: video, corner marks, state cards, zoom chip, focus ring, blink and flash. */
export function Viewfinder({ camera, block, blockedNotice, overflowNotice }: ViewfinderProps) {
  const [ring, setRing] = useState<FocusRing | null>(null)
  const ringTimerRef = useRef<number | null>(null)
  const { phase, facing, isMirrored, zoom, shutterTick, isFlashing, videoRef } = camera
  const isLive = phase === 'live'

  useEffect(
    () => () => {
      if (ringTimerRef.current !== null) window.clearTimeout(ringTimerRef.current)
    },
    [],
  )

  const { ref: frameRef, handlers } = useViewfinderGestures({
    zoom,
    onZoom: camera.setZoom,
    onTap: (tap, pixel) => {
      camera.focusAt(tap)
      setRing((current) => ({ id: (current?.id ?? 0) + 1, ...pixel }))
      if (ringTimerRef.current !== null) window.clearTimeout(ringTimerRef.current)
      ringTimerRef.current = window.setTimeout(() => setRing(null), FOCUS_RING_MS)
    },
  })

  const digital = zoom?.mode === 'digital' ? zoom.value : 1
  const scaleX = isMirrored ? -digital : digital
  const isZoomed = zoom !== null && zoom.value > zoom.range.min

  return (
    <div className="absolute inset-0 grid place-items-center">
      <div
        ref={frameRef}
        data-facing={facing}
        className="relative aspect-[63/88] w-[min(100cqw,calc(100cqh*63/88))] touch-none overflow-hidden rounded-card-lg bg-black select-none"
        {...(isLive ? handlers : {})}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          disablePictureInPicture
          className={`absolute inset-0 size-full object-cover ${isLive ? '' : 'opacity-0'}`}
          style={{ transform: `scale(${scaleX}, ${digital})` }}
        />
        {shutterTick > 0 ? (
          <span
            key={shutterTick}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 animate-vf-blink bg-black/60 motion-reduce:hidden"
          />
        ) : null}
        <StatePanel camera={camera} block={block} blockedNotice={blockedNotice} />
        {CORNERS.map((corner) => (
          <i
            key={corner}
            aria-hidden="true"
            className={`pointer-events-none absolute size-[26px] border-[2.5px] border-cyan ${corner}`}
          />
        ))}
        {overflowNotice ? (
          <div className="absolute inset-x-2 top-2">
            <Notice tone="info">{overflowNotice}</Notice>
          </div>
        ) : null}
        {isLive && isZoomed ? (
          <button
            type="button"
            onClick={() => camera.setZoom(zoom.range.min)}
            className="absolute bottom-2 left-1/2 -translate-x-1/2 cursor-pointer appearance-none rounded-full border-0 bg-black/60 px-2.5 py-1 font-display text-xs font-semibold text-white"
          >
            {zoomLabel(zoom.value)}
          </button>
        ) : null}
        {ring ? (
          <span
            key={ring.id}
            data-focus-ring=""
            aria-hidden="true"
            style={{ left: ring.x, top: ring.y }}
            className="pointer-events-none absolute size-16 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-cyan motion-safe:animate-vf-ring"
          />
        ) : null}
        <p aria-live="polite" className="sr-only">
          {phase === 'starting' ? CAMERA_COPY.startingLabel : ''}
        </p>
      </div>
      {createPortal(
        <div
          aria-hidden="true"
          data-flash={isFlashing ? '' : undefined}
          className={`pointer-events-none fixed inset-0 z-50 bg-white transition-opacity ${isFlashing ? 'opacity-100 duration-0' : 'opacity-0 duration-200'}`}
        />,
        document.body,
      )}
    </div>
  )
}
