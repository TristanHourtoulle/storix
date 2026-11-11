import { useRef, type KeyboardEvent, type PointerEvent } from 'react'

const SWIPE_THRESHOLD_PX = 48
const INTERACTIVE_SELECTOR = 'button, a, input, select, textarea, [role="switch"], [role="button"]'

function startsOnControl(event: PointerEvent<HTMLElement>): boolean {
  return event.target instanceof Element && event.target.closest(INTERACTIVE_SELECTOR) !== null
}

interface ThemeSwipeHandlers {
  onPointerDown: (event: PointerEvent<HTMLElement>) => void
  onPointerUp: (event: PointerEvent<HTMLElement>) => void
  onPointerCancel: () => void
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void
}

/** Horizontal swipe and arrow keys stepping through themes: left for the next, right for the previous. */
export function useThemeSwipe(onStep: (delta: 1 | -1) => void): ThemeSwipeHandlers {
  const startX = useRef<number | null>(null)

  return {
    onPointerDown: (event) => {
      startX.current = startsOnControl(event) ? null : event.clientX
    },
    onPointerUp: (event) => {
      if (startX.current === null) return
      const dx = event.clientX - startX.current
      startX.current = null
      if (Math.abs(dx) < SWIPE_THRESHOLD_PX) return
      onStep(dx < 0 ? 1 : -1)
    },
    onPointerCancel: () => {
      startX.current = null
    },
    onKeyDown: (event) => {
      if (event.key === 'ArrowRight') onStep(1)
      if (event.key === 'ArrowLeft') onStep(-1)
    },
  }
}
