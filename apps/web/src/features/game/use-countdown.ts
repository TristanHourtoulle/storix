import { useEffect, useRef, useState } from 'react'

function remaining(targetIso: string | null): number | null {
  if (targetIso === null) return null
  return Math.max(0, new Date(targetIso).getTime() - Date.now())
}

/** Returns the milliseconds left until a target, ticking every second; calls onElapsed once at 0. */
export function useCountdown(targetIso: string | null, onElapsed: () => void): number | null {
  const [ms, setMs] = useState(() => remaining(targetIso))
  const onElapsedRef = useRef(onElapsed)
  const firedForRef = useRef<string | null>(null)

  useEffect(() => {
    onElapsedRef.current = onElapsed
  })

  useEffect(() => {
    function tick() {
      const next = remaining(targetIso)
      setMs(next)
      if (next === 0 && targetIso !== null && firedForRef.current !== targetIso) {
        firedForRef.current = targetIso
        onElapsedRef.current()
      }
    }
    tick()
    if (targetIso === null) return undefined
    const id = setInterval(tick, 1000)
    document.addEventListener('visibilitychange', tick)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [targetIso])

  return targetIso === null ? null : ms
}
