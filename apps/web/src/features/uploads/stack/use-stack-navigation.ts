import { useCallback, useEffect, useRef, type RefObject } from 'react'
import { flushSync } from 'react-dom'
import type { UploadSession } from '../session/use-upload-session'
import {
  animateNext,
  animatePrev,
  animatePromote,
  animateRemove,
  animateRubberBand,
  settleMotion,
} from './stack-motion'

const TEXT_FIELDS = 'input, textarea, select, [contenteditable="true"]'

export interface StackNavigationInput {
  session: UploadSession
  reduced: boolean
  isPaused: boolean
  topRef: RefObject<HTMLElement | null>
  underRef: RefObject<HTMLElement | null>
  prevRef: RefObject<HTMLElement | null>
  titleRef: RefObject<HTMLInputElement | null>
  deckRef: RefObject<HTMLElement | null>
}

export interface StackNavigation {
  goNext(options?: { focusTitle?: boolean }): Promise<void>
  goPrev(): Promise<void>
  removeCurrent(): Promise<void>
  isLocked(): boolean
}

function enterFromRight(prev: HTMLElement | null): HTMLElement | null {
  if (!prev) return null
  prev.style.transform = 'translateX(110%)'
  prev.style.visibility = 'visible'
  return prev
}

function isTypingTarget(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(TEXT_FIELDS) !== null
}

/**
 * Buttons, swipes and arrow keys share these moves: each one plays its motion, then commits to the
 * session, so the deck re-renders after the motion. Input is locked while a motion runs.
 */
export function useStackNavigation(input: StackNavigationInput): StackNavigation {
  const inputRef = useRef(input)
  const lockRef = useRef(false)

  useEffect(() => {
    inputRef.current = input
  })

  const runLocked = useCallback(async (move: () => Promise<void>): Promise<void> => {
    if (lockRef.current) return
    lockRef.current = true
    try {
      await move()
    } finally {
      lockRef.current = false
    }
  }, [])

  const goNext = useCallback(
    (options: { focusTitle?: boolean } = {}): Promise<void> =>
      runLocked(async () => {
        const { session, reduced, topRef, underRef, titleRef } = inputRef.current
        const top = topRef.current
        if (top) await animateNext(top, underRef.current, reduced)
        flushSync(() => session.next())
        settleMotion(inputRef.current.deckRef.current)
        if (options.focusTitle) titleRef.current?.focus({ preventScroll: true })
      }),
    [runLocked],
  )

  const goPrev = useCallback(
    (): Promise<void> =>
      runLocked(async () => {
        const { session, reduced, topRef, prevRef } = inputRef.current
        const top = topRef.current
        const prev = prevRef.current
        if (session.state.index === 0) {
          if (top) await animateRubberBand(top, reduced)
          return
        }
        if (top && prev) await animatePrev(prev, top, reduced)
        flushSync(() => session.prev())
        settleMotion(inputRef.current.deckRef.current)
      }),
    [runLocked],
  )

  const removeCurrent = useCallback(
    (): Promise<void> =>
      runLocked(async () => {
        const { session, reduced, topRef, underRef, prevRef } = inputRef.current
        const card = session.state.cards[session.state.index]
        if (!card) return
        const top = topRef.current
        const incoming = underRef.current ?? enterFromRight(prevRef.current)
        await Promise.all([
          top ? animateRemove(top, reduced) : null,
          incoming ? animatePromote(incoming, reduced) : null,
        ])
        flushSync(() => void session.remove(card.localId))
        settleMotion(inputRef.current.deckRef.current)
      }),
    [runLocked],
  )

  const isLocked = useCallback((): boolean => lockRef.current, [])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (inputRef.current.isPaused || event.defaultPrevented) return
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
      if (isTypingTarget(event.target) || document.querySelector('dialog[open]')) return
      if (event.key === 'ArrowRight') {
        event.preventDefault()
        void goNext()
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault()
        void goPrev()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [goNext, goPrev])

  return { goNext, goPrev, removeCurrent, isLocked }
}
