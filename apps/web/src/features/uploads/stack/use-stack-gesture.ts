import { useCallback, useEffect, useRef, useState, type PointerEvent, type RefObject } from 'react'
import { animateCancel, animateRubberBand, rubberBand } from './stack-motion'

const AXIS_LOCK_PX = 10
const MIN_COMMIT_PX = 80
const COMMIT_WIDTH_RATIO = 0.25
const FLING_SPEED = 0.45
const FLING_MIN_PX = 24
const VELOCITY_WINDOW_MS = 100
const PREV_RESISTANCE = 0.25
const IGNORED_TARGETS = 'input, textarea, select, button, a, [data-no-swipe]'

export type SwipeVerdict = 'next' | 'prev' | 'rubber' | 'cancel'

/** Decides what a released horizontal drag does (R2, R4). */
export function resolveSwipe(input: {
  dx: number
  vx: number
  width: number
  canPrev: boolean
}): SwipeVerdict {
  const { dx, vx, width, canPrev } = input
  const isFar = Math.abs(dx) >= Math.max(MIN_COMMIT_PX, COMMIT_WIDTH_RATIO * width)
  const isFling =
    Math.abs(vx) >= FLING_SPEED && Math.abs(dx) >= FLING_MIN_PX && Math.sign(vx) === Math.sign(dx)
  if (dx < 0 && !canPrev) return 'rubber'
  if (!isFar && !isFling) return 'cancel'
  return dx > 0 ? 'next' : 'prev'
}

export interface StackGestureInput {
  canPrev: boolean
  reduced: boolean
  isLocked: () => boolean
  topRef: RefObject<HTMLElement | null>
  underRef: RefObject<HTMLElement | null>
  prevRef: RefObject<HTMLElement | null>
  onNext(): void
  onPrev(): void
}

interface Sample {
  t: number
  x: number
}

interface Drag {
  pointerId: number
  startX: number
  startY: number
  axis: 'pending' | 'x' | 'y'
  dx: number
  samples: readonly Sample[]
}

export interface StackGestureBind {
  onPointerDown(event: PointerEvent<HTMLElement>): void
  onPointerMove(event: PointerEvent<HTMLElement>): void
  onPointerUp(event: PointerEvent<HTMLElement>): void
  onPointerCancel(event: PointerEvent<HTMLElement>): void
}

function velocityOf(samples: readonly Sample[]): number {
  const first = samples[0]
  const last = samples[samples.length - 1]
  if (!first || !last || last.t === first.t) return 0
  return (last.x - first.x) / (last.t - first.t)
}

function freeze(el: HTMLElement | null): void {
  if (el) el.style.transition = 'none'
}

/** Horizontal swipe on the top card with pointer events; vertical moves stay native scroll (R4, R6). */
export function useStackGesture(input: StackGestureInput): {
  bind: StackGestureBind
  isDragging: boolean
} {
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef(input)
  const dragRef = useRef<Drag | null>(null)
  const frameRef = useRef(0)

  useEffect(() => {
    inputRef.current = input
  })

  useEffect(() => () => cancelAnimationFrame(frameRef.current), [])

  const paint = useCallback((dx: number): void => {
    const { canPrev, reduced, topRef, underRef, prevRef } = inputRef.current
    const top = topRef.current
    if (!top) return
    const under = underRef.current
    const prev = prevRef.current
    const width = top.offsetWidth || 1
    const progress = Math.min(1, Math.abs(dx) / width)
    ;[top, under, prev].forEach(freeze)
    if (dx >= 0) {
      top.style.transform = reduced
        ? `translateX(${dx}px)`
        : `translateX(${dx}px) rotate(${dx / 20}deg)`
      if (under) {
        under.style.transform = `translateY(${10 * (1 - progress)}px) scale(${0.94 + 0.06 * progress})`
      }
      if (prev) prev.style.transform = ''
      return
    }
    if (!canPrev) {
      top.style.transform = `translateX(${rubberBand(dx)}px)`
      return
    }
    top.style.transform = `translateX(${dx * PREV_RESISTANCE}px)`
    if (under) under.style.transform = ''
    if (prev) {
      prev.style.visibility = 'visible'
      prev.style.transform = `translateX(${(1 - progress) * 110}%)`
    }
  }, [])

  const schedulePaint = useCallback(
    (dx: number): void => {
      cancelAnimationFrame(frameRef.current)
      frameRef.current = requestAnimationFrame(() => paint(dx))
    },
    [paint],
  )

  const springBack = useCallback((): void => {
    const { reduced, topRef, underRef, prevRef } = inputRef.current
    ;[topRef.current, underRef.current, prevRef.current].forEach((el) => {
      if (el) void animateCancel(el, reduced)
    })
  }, [])

  const end = useCallback(
    (event: PointerEvent<HTMLElement>, isCancelled: boolean): void => {
      const drag = dragRef.current
      if (!drag || drag.pointerId !== event.pointerId) return
      dragRef.current = null
      if (drag.axis !== 'x') return
      cancelAnimationFrame(frameRef.current)
      setIsDragging(false)
      const { canPrev, reduced, topRef, onNext, onPrev } = inputRef.current
      const top = topRef.current
      if (!top) return
      paint(drag.dx)
      if (isCancelled) {
        springBack()
        return
      }
      const verdict = resolveSwipe({
        dx: drag.dx,
        vx: velocityOf(drag.samples),
        width: top.offsetWidth,
        canPrev,
      })
      if (verdict === 'next') onNext()
      else if (verdict === 'prev') onPrev()
      else if (verdict === 'rubber') void animateRubberBand(top, reduced)
      else springBack()
    },
    [paint, springBack],
  )

  const bind: StackGestureBind = {
    onPointerDown: (event) => {
      if (dragRef.current || inputRef.current.isLocked()) return
      if (event.pointerType === 'mouse' && event.button !== 0) return
      if (event.target instanceof Element && event.target.closest(IGNORED_TARGETS)) return
      dragRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        axis: 'pending',
        dx: 0,
        samples: [{ t: event.timeStamp, x: event.clientX }],
      }
    },
    onPointerMove: (event) => {
      const drag = dragRef.current
      if (!drag || drag.pointerId !== event.pointerId || drag.axis === 'y') return
      const dx = event.clientX - drag.startX
      const dy = event.clientY - drag.startY
      if (drag.axis === 'pending') {
        if (Math.hypot(dx, dy) < AXIS_LOCK_PX) return
        if (Math.abs(dy) > Math.abs(dx)) {
          dragRef.current = null
          return
        }
        try {
          event.currentTarget.setPointerCapture(event.pointerId)
        } catch {
          dragRef.current = null
          return
        }
        if (document.activeElement instanceof HTMLInputElement) document.activeElement.blur()
        setIsDragging(true)
      }
      const samples = [...drag.samples, { t: event.timeStamp, x: event.clientX }].filter(
        (sample) => event.timeStamp - sample.t <= VELOCITY_WINDOW_MS,
      )
      dragRef.current = { ...drag, axis: 'x', dx, samples }
      schedulePaint(dx)
    },
    onPointerUp: (event) => end(event, false),
    onPointerCancel: (event) => end(event, true),
  }

  return { bind, isDragging }
}
