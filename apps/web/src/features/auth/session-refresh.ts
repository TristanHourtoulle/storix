import { authClient } from '@/lib/auth-client'
import { logger } from '@/lib/logger'

const REFRESH_INTERVAL_MS = 10 * 60 * 1000

let lastRefreshAt: number | null = null

async function refreshSession(): Promise<void> {
  if (!navigator.onLine) return
  const now = Date.now()
  if (lastRefreshAt !== null && now - lastRefreshAt < REFRESH_INTERVAL_MS) return
  lastRefreshAt = now
  const { error } = await authClient.getSession()
  if (error) logger.warn('Session refresh failed', { status: error.status })
}

function runRefresh(): void {
  refreshSession().catch((error: unknown) => logger.warn('Session refresh failed', { error }))
}

/** Renews the session cookie at boot and whenever the app becomes visible again (throttled). */
export function startSessionRefresh(): void {
  runRefresh()
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') runRefresh()
  })
}
