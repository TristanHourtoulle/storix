import { useEffect, type RefObject } from 'react'
import { isIos, isStandalone } from './platform'

const STUCK_THRESHOLD_PX = 4
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
 * Works around iOS WebKit in home-screen apps keeping a shrunken viewport after the keyboard
 * closes or the app resumes, which leaves bottom-anchored chrome (the tab bar) floating mid-screen.
 * When the viewport looks stuck, the shell is hidden and shown in one synchronous reflow so WebKit
 * re-measures it, and the scroll position is restored.
 */
export function useViewportHeal(shellRef: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    if (!isIos() || !isStandalone()) return
    const viewport = window.visualViewport
    let maxHeight = window.innerHeight
    let lastWidth = window.innerWidth
    let timer: number | undefined

    const isStuck = (): boolean => {
      const inner = window.innerHeight
      const visual = viewport?.height ?? inner
      return maxHeight - inner > STUCK_THRESHOLD_PX || inner - visual > STUCK_THRESHOLD_PX
    }

    const heal = (): void => {
      timer = undefined
      const shell = shellRef.current
      if (!shell || document.visibilityState !== 'visible') return
      if (isTextEditable(document.activeElement) || (viewport?.scale ?? 1) > 1.01) return
      if (!isStuck()) return
      const { scrollX, scrollY } = window
      shell.style.display = 'none'
      void shell.offsetHeight
      shell.style.display = ''
      window.scrollTo(scrollX, scrollY)
    }

    const schedule = (): void => {
      window.clearTimeout(timer)
      timer = window.setTimeout(heal, SETTLE_DELAY_MS)
    }

    const onResize = (): void => {
      if (window.innerWidth !== lastWidth) {
        lastWidth = window.innerWidth
        maxHeight = window.innerHeight
      } else {
        maxHeight = Math.max(maxHeight, window.innerHeight)
      }
      schedule()
    }

    const onVisibility = (): void => {
      if (document.visibilityState === 'visible') schedule()
    }

    document.addEventListener('focusout', schedule, true)
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pageshow', schedule)
    window.addEventListener('resize', onResize)
    viewport?.addEventListener('resize', schedule)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('focusout', schedule, true)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pageshow', schedule)
      window.removeEventListener('resize', onResize)
      viewport?.removeEventListener('resize', schedule)
    }
  }, [shellRef])
}
