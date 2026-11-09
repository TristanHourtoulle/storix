import { useLayoutEffect, useState, type RefCallback } from 'react'

/** Publishes an element's rendered height as a CSS variable on the document root while it is mounted. */
export function useHeightVar(name: string): RefCallback<HTMLElement> {
  const [element, setElement] = useState<HTMLElement | null>(null)

  useLayoutEffect(() => {
    if (!element) return
    const root = document.documentElement
    const publish = (): void => {
      root.style.setProperty(name, `${element.getBoundingClientRect().height}px`)
    }
    publish()
    const observer = new ResizeObserver(publish)
    observer.observe(element)
    return () => {
      observer.disconnect()
      root.style.removeProperty(name)
    }
  }, [element, name])

  return setElement
}
