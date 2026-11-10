import { useEffect, useRef } from 'react'

/** Scrolls the window back to the top when `key` changes, leaving the restored position alone on mount. */
export function useScrollTopOnChange(key: string): void {
  const previousKey = useRef(key)
  useEffect(() => {
    if (previousKey.current === key) return
    previousKey.current = key
    window.scrollTo({ top: 0 })
  }, [key])
}
