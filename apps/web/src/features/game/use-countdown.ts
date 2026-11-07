import { useEffect, useRef, useSyncExternalStore } from 'react'

const RETRY_DELAYS_MS = [5_000, 15_000, 30_000]

function subscribe(notify: () => void): () => void {
  const id = setInterval(notify, 1000)
  document.addEventListener('visibilitychange', notify)
  return () => {
    clearInterval(id)
    document.removeEventListener('visibilitychange', notify)
  }
}

function getNowSecond(): number {
  return Math.floor(Date.now() / 1000) * 1000
}

/**
 * Returns the milliseconds left until a target, ticking every second.
 * Once elapsed, calls onElapsed immediately then retries on a 5 s, 15 s, 30 s backoff while the target is unchanged.
 */
export function useCountdown(targetIso: string | null, onElapsed: () => void): number | null {
  const now = useSyncExternalStore(subscribe, getNowSecond, getNowSecond)
  const onElapsedRef = useRef(onElapsed)
  const remaining = targetIso === null ? null : Math.max(0, new Date(targetIso).getTime() - now)
  const isElapsed = remaining === 0

  useEffect(() => {
    onElapsedRef.current = onElapsed
  })

  useEffect(() => {
    if (!isElapsed) return undefined
    let attempt = 0
    let timer: ReturnType<typeof setTimeout>
    function fire() {
      onElapsedRef.current()
      const delay = RETRY_DELAYS_MS[Math.min(attempt, RETRY_DELAYS_MS.length - 1)] ?? 30_000
      attempt += 1
      timer = setTimeout(fire, delay)
    }
    fire()
    return () => clearTimeout(timer)
  }, [isElapsed, targetIso])

  return remaining
}
