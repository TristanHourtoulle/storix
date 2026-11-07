import { useCallback, useLayoutEffect, useRef, useState } from 'react'

interface GridMetrics {
  width: number
  offsetTop: number
}

interface GridMetricsResult extends GridMetrics {
  containerRef: React.RefObject<HTMLDivElement | null>
}

/** Tracks a container's width and document offset via a ResizeObserver. */
export function useGridMetrics(): GridMetricsResult {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [metrics, setMetrics] = useState<GridMetrics>({ width: 0, offsetTop: 0 })

  const measure = useCallback(() => {
    const node = containerRef.current
    if (!node) return
    const next = {
      width: node.clientWidth,
      offsetTop: node.getBoundingClientRect().top + window.scrollY,
    }
    setMetrics((previous) =>
      previous.width === next.width && previous.offsetTop === next.offsetTop ? previous : next,
    )
  }, [])

  useLayoutEffect(() => {
    const node = containerRef.current
    if (!node) return undefined
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    observer.observe(document.body)
    return () => observer.disconnect()
  }, [measure])

  return { containerRef, ...metrics }
}
