import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type PointerEventHandler,
  type RefCallback,
} from 'react'
import {
  panCropView,
  zoomCropViewAt,
  type CropFrame,
  type CropView,
  type ImageSize,
} from '@storix/shared/domain'
import { logger } from '@/lib/logger'

const WHEEL_ZOOM_SPEED = 0.002
const GESTURE_EVENTS = ['gesturestart', 'gesturechange', 'gestureend'] as const

interface Point {
  x: number
  y: number
}

export interface CropGesturesInput {
  view: CropView
  imageSize: ImageSize
  frame: CropFrame
  viewportWidthPx: number
  onChange: (view: CropView) => void
}

export interface CropGestures {
  onPointerDown: PointerEventHandler
  onPointerMove: PointerEventHandler
  onPointerUp: PointerEventHandler
  onPointerCancel: PointerEventHandler
  onLostPointerCapture: PointerEventHandler
  attachStage: RefCallback<HTMLElement>
  attachFrame: RefCallback<HTMLElement>
}

function numberField(event: Event, field: string): number | null {
  const value: unknown = Reflect.get(event, field)
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function gestureScaleOf(event: Event): number | null {
  return numberField(event, 'scale')
}

function clientXOf(event: Event): number {
  return numberField(event, 'clientX') ?? Number.NaN
}

function clientYOf(event: Event): number {
  return numberField(event, 'clientY') ?? Number.NaN
}

function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

/** Pans with one pointer, pinch-zooms with two around their midpoint, and zooms with the wheel. */
export function useCropGestures({
  view,
  imageSize,
  frame,
  viewportWidthPx,
  onChange,
}: CropGesturesInput): CropGestures {
  const pointersRef = useRef<ReadonlyMap<number, Point>>(new Map())
  const viewRef = useRef(view)
  const frameElementRef = useRef<HTMLElement | null>(null)
  const [stage, setStage] = useState<HTMLElement | null>(null)

  useEffect(() => {
    viewRef.current = view
  }, [view])

  const commit = useCallback(
    (next: CropView): void => {
      viewRef.current = next
      onChange(next)
    },
    [onChange],
  )

  const focusOf = useCallback((point: Point): Point => {
    const rect = frameElementRef.current?.getBoundingClientRect()
    const isUsable =
      rect && rect.width > 0 && rect.height > 0 && [point.x, point.y].every(Number.isFinite)
    if (!rect || !isUsable) return { x: 0.5, y: 0.5 }
    return { x: (point.x - rect.left) / rect.width, y: (point.y - rect.top) / rect.height }
  }, [])

  const onPointerDown = useCallback((event: ReactPointerEvent): void => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch (error) {
      logger.debug('Pointer capture unavailable', { pointerId: event.pointerId, error })
    }
    const tracked = event.isPrimary ? new Map<number, Point>() : pointersRef.current
    pointersRef.current = new Map(tracked).set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    })
  }, [])

  const onPointerMove = useCallback(
    (event: ReactPointerEvent): void => {
      const previous = pointersRef.current
      const before = previous.get(event.pointerId)
      if (!before) return
      const point = { x: event.clientX, y: event.clientY }
      const next = new Map(previous).set(event.pointerId, point)
      pointersRef.current = next
      const others = [...previous.entries()].filter(([id]) => id !== event.pointerId)
      const partner = others[0]?.[1]
      if (!partner) {
        commit(
          panCropView(
            viewRef.current,
            { dxPx: point.x - before.x, dyPx: point.y - before.y, viewportWidthPx },
            imageSize,
            frame,
          ),
        )
        return
      }
      const previousDistance = distance(before, partner)
      const nextDistance = distance(point, partner)
      const previousMid = midpoint(before, partner)
      const nextMid = midpoint(point, partner)
      const focus = focusOf(nextMid)
      const zoomed =
        previousDistance > 0
          ? zoomCropViewAt(
              viewRef.current,
              { factor: nextDistance / previousDistance, focusX: focus.x, focusY: focus.y },
              imageSize,
              frame,
            )
          : viewRef.current
      commit(
        panCropView(
          zoomed,
          {
            dxPx: nextMid.x - previousMid.x,
            dyPx: nextMid.y - previousMid.y,
            viewportWidthPx,
          },
          imageSize,
          frame,
        ),
      )
    },
    [commit, focusOf, frame, imageSize, viewportWidthPx],
  )

  const release = useCallback((event: ReactPointerEvent): void => {
    if (!pointersRef.current.has(event.pointerId)) return
    pointersRef.current = new Map([...pointersRef.current].filter(([id]) => id !== event.pointerId))
  }, [])

  useEffect(() => {
    if (!stage) return
    const handleWheel = (event: WheelEvent): void => {
      event.preventDefault()
      const focus = focusOf({ x: event.clientX, y: event.clientY })
      commit(
        zoomCropViewAt(
          viewRef.current,
          { factor: Math.exp(-event.deltaY * WHEEL_ZOOM_SPEED), focusX: focus.x, focusY: focus.y },
          imageSize,
          frame,
        ),
      )
    }
    let gestureScale = 1
    const handleGesture = (event: Event): void => {
      event.preventDefault()
      const scale = gestureScaleOf(event)
      if (event.type === 'gesturestart' || scale === null) {
        gestureScale = scale ?? 1
        return
      }
      if (pointersRef.current.size > 0 || gestureScale <= 0) return
      const focus = focusOf({ x: clientXOf(event), y: clientYOf(event) })
      commit(
        zoomCropViewAt(
          viewRef.current,
          { factor: scale / gestureScale, focusX: focus.x, focusY: focus.y },
          imageSize,
          frame,
        ),
      )
      gestureScale = scale
    }
    stage.addEventListener('wheel', handleWheel, { passive: false })
    GESTURE_EVENTS.forEach((type) =>
      stage.addEventListener(type, handleGesture, { passive: false }),
    )
    return () => {
      stage.removeEventListener('wheel', handleWheel)
      GESTURE_EVENTS.forEach((type) => stage.removeEventListener(type, handleGesture))
    }
  }, [stage, commit, focusOf, frame, imageSize])

  const attachStage = useCallback<RefCallback<HTMLElement>>((node) => setStage(node), [])
  const attachFrame = useCallback<RefCallback<HTMLElement>>((node) => {
    frameElementRef.current = node
  }, [])

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp: release,
    onPointerCancel: release,
    onLostPointerCapture: release,
    attachStage,
    attachFrame,
  }
}
