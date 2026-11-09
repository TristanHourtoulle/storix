import { useCallback, useEffect, useRef, type PointerEvent, type PointerEventHandler } from 'react'
import { pinchZoom, type NormalizedPoint } from '@storix/shared/domain'
import type { CameraZoomState } from './camera-types'

export interface ViewfinderGestureHandlers {
  onPointerDown: PointerEventHandler
  onPointerMove: PointerEventHandler
  onPointerUp: PointerEventHandler
  onPointerCancel: PointerEventHandler
}

interface ViewfinderGestureOptions {
  isEnabled: boolean
  zoom: CameraZoomState | null
  onZoom: (value: number) => void
  onTap: (tap: NormalizedPoint, pixel: { x: number; y: number }) => void
}

interface Point {
  x: number
  y: number
}

interface Gesture {
  start: Point
  startTime: number
  isPinch: boolean
  hasMoved: boolean
}

interface Pinch {
  startDistance: number
  startZoom: number
}

const TAP_MAX_MOVE_PX = 10
const TAP_MAX_MS = 300

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function pinchDistance(pointers: ReadonlyMap<number, Point>): number | null {
  const [first, second] = [...pointers.values()]
  return first && second ? distance(first, second) : null
}

function isOnControl(event: PointerEvent): boolean {
  return event.target instanceof Element && event.target.closest('button') !== null
}

function preventPageZoom(event: Event): void {
  event.preventDefault()
}

/** Pinch (two pointers) to zoom and tap (V7 thresholds) to focus, on the frame element. */
export function useViewfinderGestures(options: ViewfinderGestureOptions): {
  ref: (node: HTMLElement | null) => void
  handlers: ViewfinderGestureHandlers
} {
  const optionsRef = useRef(options)
  const pointersRef = useRef<ReadonlyMap<number, Point>>(new Map())
  const gestureRef = useRef<Gesture | null>(null)
  const pinchRef = useRef<Pinch | null>(null)

  useEffect(() => {
    optionsRef.current = options
  })

  const ref = useCallback((node: HTMLElement | null) => {
    if (!node) return undefined
    node.addEventListener('gesturestart', preventPageZoom, { passive: false })
    return () => node.removeEventListener('gesturestart', preventPageZoom)
  }, [])

  const onPointerDown = useCallback((event: PointerEvent) => {
    if (!optionsRef.current.isEnabled || isOnControl(event)) return
    const point = { x: event.clientX, y: event.clientY }
    const pointers = new Map([...pointersRef.current, [event.pointerId, point]])
    pointersRef.current = pointers
    if (pointers.size === 1) {
      gestureRef.current = {
        start: point,
        startTime: event.timeStamp,
        isPinch: false,
        hasMoved: false,
      }
      return
    }
    const gesture = gestureRef.current
    if (gesture) gestureRef.current = { ...gesture, isPinch: true }
    const zoom = optionsRef.current.zoom
    const startDistance = pinchDistance(pointers)
    pinchRef.current = zoom && startDistance ? { startDistance, startZoom: zoom.value } : null
  }, [])

  const onPointerMove = useCallback((event: PointerEvent) => {
    if (!pointersRef.current.has(event.pointerId)) return
    const point = { x: event.clientX, y: event.clientY }
    const pointers = new Map([...pointersRef.current, [event.pointerId, point]])
    pointersRef.current = pointers
    const gesture = gestureRef.current
    if (gesture && !gesture.hasMoved && distance(gesture.start, point) >= TAP_MAX_MOVE_PX) {
      gestureRef.current = { ...gesture, hasMoved: true }
    }
    const pinch = pinchRef.current
    const zoom = optionsRef.current.zoom
    const current = pinchDistance(pointers)
    if (!pinch || !zoom || current === null) return
    optionsRef.current.onZoom(pinchZoom(pinch.startZoom, pinch.startDistance, current, zoom.range))
  }, [])

  const endPointer = useCallback((event: PointerEvent, isCancelled: boolean) => {
    if (!pointersRef.current.has(event.pointerId)) return
    const pointers = new Map(
      [...pointersRef.current].filter(([pointerId]) => pointerId !== event.pointerId),
    )
    pointersRef.current = pointers
    if (pointers.size > 0) {
      pinchRef.current = null
      return
    }
    const gesture = gestureRef.current
    gestureRef.current = null
    pinchRef.current = null
    const point = { x: event.clientX, y: event.clientY }
    const isTap =
      !isCancelled &&
      gesture !== null &&
      !gesture.isPinch &&
      !gesture.hasMoved &&
      distance(gesture.start, point) < TAP_MAX_MOVE_PX &&
      event.timeStamp - gesture.startTime < TAP_MAX_MS
    if (!isTap || !optionsRef.current.isEnabled) return
    const rect = event.currentTarget.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return
    const pixel = { x: point.x - rect.left, y: point.y - rect.top }
    optionsRef.current.onTap({ x: pixel.x / rect.width, y: pixel.y / rect.height }, pixel)
  }, [])

  const onPointerUp = useCallback((event: PointerEvent) => endPointer(event, false), [endPointer])
  const onPointerCancel = useCallback(
    (event: PointerEvent) => endPointer(event, true),
    [endPointer],
  )

  return { ref, handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel } }
}
