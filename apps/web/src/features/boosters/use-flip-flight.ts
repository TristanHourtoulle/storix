import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefCallback } from 'react'
import { flipTransform, flipTransformCss, isBoxInViewport, type Box } from '@storix/shared'

export type FlightPhase = 'entering' | 'open' | 'leaving'

export const FLIGHT_MS = 380
export const FADE_MS = 200

const FLIGHT_EASING = 'cubic-bezier(0.2, 0.8, 0.2, 1)'

interface FlipFlightOptions {
  getOrigin: () => Box | null
  isReducedMotion: boolean
  onLeft: () => void
}

interface FlipFlight {
  flightRef: RefCallback<HTMLDivElement>
  phase: FlightPhase
  isFading: boolean
  leave: () => void
}

function boxOf(element: HTMLElement): Box {
  const { left, top, width, height } = element.getBoundingClientRect()
  return { left, top, width, height }
}

function forceReflow(element: HTMLElement): void {
  element.getBoundingClientRect()
}

/** FLIP shared-element flight between a recap mini-card and the loupe card, with a fade fallback. */
export function useFlipFlight({ getOrigin, isReducedMotion, onLeft }: FlipFlightOptions): FlipFlight {
  const element = useRef<HTMLDivElement | null>(null)
  const [phase, setPhase] = useState<FlightPhase>('entering')
  const [isFading, setIsFading] = useState(false)
  const phaseRef = useRef<FlightPhase>('entering')
  const timers = useRef<readonly number[]>([])
  const stopListening = useRef<(() => void) | null>(null)
  const latest = useRef({ getOrigin, isReducedMotion, onLeft })

  useEffect(() => {
    latest.current = { getOrigin, isReducedMotion, onLeft }
  }, [getOrigin, isReducedMotion, onLeft])

  const flightRef = useCallback<RefCallback<HTMLDivElement>>((node) => {
    element.current = node
  }, [])

  const cancelPending = useCallback((): void => {
    timers.current.forEach((timer) => window.clearTimeout(timer))
    timers.current = []
    stopListening.current?.()
    stopListening.current = null
  }, [])

  const schedule = useCallback((delay: number, run: () => void): void => {
    timers.current = [...timers.current, window.setTimeout(run, delay)]
  }, [])

  const flyTo = useCallback(
    (node: HTMLDivElement, transform: string, done: () => void): void => {
      let isDone = false
      const finish = (): void => {
        if (isDone) return
        isDone = true
        cancelPending()
        node.style.transition = ''
        done()
      }
      const handleEnd = (event: TransitionEvent): void => {
        if (event.target === node && event.propertyName === 'transform') finish()
      }
      node.addEventListener('transitionend', handleEnd)
      stopListening.current = () => node.removeEventListener('transitionend', handleEnd)
      node.style.transition = `transform ${FLIGHT_MS}ms ${FLIGHT_EASING}`
      node.style.transform = transform
      schedule(FLIGHT_MS + 80, finish)
    },
    [cancelPending, schedule],
  )

  const transformFromOrigin = useCallback((to: Box): string | null => {
    const { getOrigin: readOrigin, isReducedMotion: isReduced } = latest.current
    if (isReduced) return null
    const origin = readOrigin()
    if (!origin || !isBoxInViewport(origin, window.innerWidth, window.innerHeight)) return null
    const transform = flipTransform(origin, to)
    return transform ? flipTransformCss(transform) : null
  }, [])

  const settle = useCallback((next: FlightPhase): void => {
    phaseRef.current = next
    setPhase(next)
  }, [])

  useLayoutEffect(() => {
    const node = element.current
    if (!node) return
    node.style.transition = 'none'
    node.style.transform = 'none'
    const start = transformFromOrigin(boxOf(node))
    if (!start) {
      setIsFading(true)
      schedule(FADE_MS, () => settle('open'))
      return cancelPending
    }
    node.style.transformOrigin = '0 0'
    node.style.transform = start
    forceReflow(node)
    flyTo(node, 'none', () => {
      if (phaseRef.current === 'entering') settle('open')
    })
    return cancelPending
  }, [cancelPending, flyTo, schedule, settle, transformFromOrigin])

  const leave = useCallback((): void => {
    if (phaseRef.current === 'leaving') return
    cancelPending()
    settle('leaving')
    const node = element.current
    const onDone = (): void => latest.current.onLeft()
    if (!node) {
      onDone()
      return
    }
    const current = getComputedStyle(node).transform
    node.style.transition = 'none'
    node.style.transform = 'none'
    const target = transformFromOrigin(boxOf(node))
    node.style.transform = current
    if (!target) {
      setIsFading(true)
      schedule(FADE_MS, onDone)
      return
    }
    setIsFading(false)
    node.style.transformOrigin = '0 0'
    forceReflow(node)
    flyTo(node, target, onDone)
  }, [cancelPending, flyTo, schedule, settle, transformFromOrigin])

  return { flightRef, phase, isFading, leave }
}
