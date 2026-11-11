import { useEffect, type RefObject } from 'react'
import { isIos, isStandalone } from './platform'

const STUCK_THRESHOLD_PX = 8
const HEAL_INTERVAL_MS = 1000
const SETTLE_DELAY_MS = 160
const NON_TEXT_INPUTS = new Set([
  'button',
  'checkbox',
  'color',
  'file',
  'radio',
  'range',
  'reset',
  'submit',
])

function isTextEditable(element: Element | null): boolean {
  if (element instanceof HTMLTextAreaElement) return true
  if (element instanceof HTMLInputElement) return !NON_TEXT_INPUTS.has(element.type)
  return element instanceof HTMLElement && element.isContentEditable
}

/**
 * Works around iOS WebKit in home-screen apps keeping a stale viewport after the keyboard closes
 * or the app resumes, which leaves the bottom tab bar floating mid-screen. When the bar's bottom
 * edge sits above the viewport bottom, the shell is hidden and shown in one synchronous reflow so
 * WebKit re-measures it, and the scroll position is restored.
 */
export function useViewportHeal(
  shellRef: RefObject<HTMLElement | null>,
  barSelector: string,
  isSuspended: boolean,
): void {
  useEffect(() => {
    if (isSuspended || !isIos() || !isStandalone()) return
    const viewport = window.visualViewport
    let timer: number | undefined
    let lastHealAt = 0

    const viewportBottom = (): number =>
      Math.max(
        window.innerHeight,
        document.documentElement.clientHeight,
        viewport ? viewport.height + viewport.offsetTop : 0,
      )

    const isBarStuck = (shell: HTMLElement): boolean => {
      const bar = shell.querySelector(barSelector)
      if (!bar) return false
      return viewportBottom() - bar.getBoundingClientRect().bottom > STUCK_THRESHOLD_PX
    }

    const isOverlayOpen = (): boolean =>
      document.querySelector('dialog[open], [role="dialog"], [aria-modal="true"]') !== null

    const heal = (): void => {
      timer = undefined
      const shell = shellRef.current
      if (!shell || document.visibilityState !== 'visible') return
      if (isTextEditable(document.activeElement) || (viewport?.scale ?? 1) > 1.01) return
      if (isOverlayOpen() || !isBarStuck(shell)) return
      const now = Date.now()
      if (now - lastHealAt < HEAL_INTERVAL_MS) {
        schedule(HEAL_INTERVAL_MS - (now - lastHealAt))
        return
      }
      lastHealAt = now
      const { scrollX, scrollY } = window
      shell.style.display = 'none'
      void shell.offsetHeight
      shell.style.display = ''
      window.scrollTo(scrollX, scrollY)
    }

    const schedule = (delay = SETTLE_DELAY_MS): void => {
      window.clearTimeout(timer)
      timer = window.setTimeout(heal, delay)
    }
    const onEvent = (): void => schedule()
    const onVisibility = (): void => {
      if (document.visibilityState === 'visible') schedule()
    }

    document.addEventListener('focusout', onEvent, true)
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pageshow', onEvent)
    window.addEventListener('resize', onEvent)
    viewport?.addEventListener('resize', onEvent)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('focusout', onEvent, true)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pageshow', onEvent)
      window.removeEventListener('resize', onEvent)
      viewport?.removeEventListener('resize', onEvent)
    }
  }, [shellRef, barSelector, isSuspended])
}
