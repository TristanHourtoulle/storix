import { logger } from '@/lib/logger'

/** Registers the service worker in production builds only. */
export async function registerServiceWorker(): Promise<void> {
  if (!import.meta.env.PROD) return
  try {
    const { getSerwist } = await import('virtual:serwist')
    const serwist = await getSerwist()
    await serwist?.register()
  } catch (error) {
    logger.error('Service worker registration failed', { error })
  }
}
