import { useEffect, useState } from 'react'

/** Re-renders every `intervalMs` while `isActive`, returning the current time. */
export function useNow(isActive: boolean, intervalMs = 1000): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    if (!isActive) return
    const timer = window.setInterval(() => setNow(new Date()), intervalMs)
    return () => window.clearInterval(timer)
  }, [isActive, intervalMs])
  return now
}
