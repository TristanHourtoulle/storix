import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'

const FOCUSABLE = [
  'a[href]',
  'area[href]',
  'button:not(:disabled)',
  'input:not(:disabled)',
  'select:not(:disabled)',
  'textarea:not(:disabled)',
  'summary',
  '[contenteditable]:not([contenteditable="false"])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

interface ModalLayer {
  container: HTMLElement
  layerRef: RefObject<HTMLDivElement | null>
  refocus: () => void
}

let layerStack: readonly RefObject<HTMLDivElement | null>[] = []

function trapTab(layer: HTMLElement, event: KeyboardEvent): void {
  const focusables = [...layer.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    (element) => element.tabIndex >= 0 && element.closest('[inert]') === null,
  )
  const first = focusables[0]
  const last = focusables[focusables.length - 1]
  event.preventDefault()
  if (!first || !last) {
    layer.focus()
    return
  }
  const active = document.activeElement
  const index = active instanceof HTMLElement ? focusables.indexOf(active) : -1
  if (index === -1) {
    ;(event.shiftKey ? last : first).focus()
    return
  }
  const next = event.shiftKey ? index - 1 : index + 1
  ;(focusables[(next + focusables.length) % focusables.length] ?? first).focus()
}

function inertSiblings(container: HTMLElement): () => void {
  const siblings = [...document.body.children].filter(
    (element): element is HTMLElement =>
      element instanceof HTMLElement && element !== container && !element.inert,
  )
  siblings.forEach((element) => {
    element.inert = true
  })
  return () =>
    siblings.forEach((element) => {
      element.inert = false
    })
}

/** Mounts a modal portal container: traps focus, handles Escape, locks the page scroll and makes the page inert. */
export function useModalLayer(onCancel: () => void): ModalLayer {
  const [container] = useState(() => document.createElement('div'))
  const layerRef = useRef<HTMLDivElement | null>(null)
  const onCancelRef = useRef(onCancel)

  useEffect(() => {
    onCancelRef.current = onCancel
  }, [onCancel])

  useLayoutEffect(() => {
    document.body.append(container)
    const stopBubbling = (event: KeyboardEvent): void => event.stopPropagation()
    container.addEventListener('keydown', stopBubbling)
    const root = document.documentElement
    const previousOverflow = root.style.overflow
    root.style.overflow = 'hidden'
    const restoreInert = inertSiblings(container)
    return () => {
      restoreInert()
      root.style.overflow = previousOverflow
      container.removeEventListener('keydown', stopBubbling)
      container.remove()
    }
  }, [container])

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    layerRef.current?.focus()
    layerStack = [...layerStack, layerRef]
    const handleKeyDown = (event: KeyboardEvent): void => {
      const layer = layerRef.current
      if (!layer || layerStack.at(-1) !== layerRef) return
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        onCancelRef.current()
      } else if (event.key === 'Tab') {
        trapTab(layer, event)
      }
    }
    document.addEventListener('keydown', handleKeyDown, true)
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true)
      layerStack = layerStack.filter((entry) => entry !== layerRef)
      previous?.focus()
    }
  }, [])

  const refocus = useCallback((): void => layerRef.current?.focus(), [])

  return { container, layerRef, refocus }
}
