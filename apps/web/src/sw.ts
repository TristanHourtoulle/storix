import { mediaCacheKey } from '@storix/shared/domain'
import {
  CacheableResponsePlugin,
  CacheFirst,
  ExpirationPlugin,
  NavigationRoute,
  NetworkFirst,
  Serwist,
} from 'serwist'
import { API_CACHE_NAME, API_CACHE_PREFIX, MEDIA_CACHE_NAME } from './features/pwa/cache-names'

interface BoosterFullPush {
  v: 1
  title: string
  body: string
  url: string
  tag: string
}

interface TaggedNotificationOptions extends NotificationOptions {
  renotify: boolean
}

const OFFLINE_READ_PATTERN = /^\/api\/(me|leagues\/[^/]+(\/cards(\/[^/]+)?)?)$/
const API_NETWORK_TIMEOUT_SECONDS = 3
const LEAGUE_URL_PATTERN = /^\/l\/[0-9a-f-]{36}$/
const PUSH_TAG_PATTERN = /^(booster-full|moment):[0-9a-f-]{36}$/
const NOTIFICATION_ICON = '/icons/icon-192.png'
const FALLBACK_TITLE = 'Storix'
const FALLBACK_BODY = "Tes boosters t'attendent"
const FALLBACK_URL = '/'

declare global {
  interface WorkerGlobalScope {
    __SW_MANIFEST: (string | { url: string; revision: string | null })[]
  }
}

declare const self: ServiceWorkerGlobalScope

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
})

serwist.registerCapture(
  ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith('/media/'),
  new CacheFirst({
    cacheName: MEDIA_CACHE_NAME,
    plugins: [
      {
        cacheKeyWillBeUsed: ({ request }) =>
          mediaCacheKey(new URL(request.url).pathname) ?? request.url,
      },
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({
        maxEntries: 500,
        maxAgeSeconds: 30 * 24 * 3600,
        purgeOnQuotaError: true,
      }),
    ],
  }),
  'GET',
)

serwist.registerCapture(
  ({ url, sameOrigin }) => sameOrigin && OFFLINE_READ_PATTERN.test(url.pathname),
  new NetworkFirst({
    cacheName: API_CACHE_NAME,
    networkTimeoutSeconds: API_NETWORK_TIMEOUT_SECONDS,
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({ maxEntries: 100 }),
    ],
  }),
  'GET',
)

serwist.registerRoute(
  new NavigationRoute(serwist.createHandlerBoundToUrl('/index.html'), {
    denylist: [/^\/api(\/|$)/, /^\/media(\/|$)/],
  }),
)

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((name) => name.startsWith(API_CACHE_PREFIX) && name !== API_CACHE_NAME)
            .map((name) => caches.delete(name)),
        ),
      ),
  )
})

function isBoosterFullPush(value: unknown): value is BoosterFullPush {
  if (typeof value !== 'object' || value === null) return false
  const { v, title, body, url, tag } = value as Record<string, unknown>
  return (
    v === 1 &&
    typeof title === 'string' &&
    typeof body === 'string' &&
    typeof url === 'string' &&
    LEAGUE_URL_PATTERN.test(url) &&
    typeof tag === 'string' &&
    PUSH_TAG_PATTERN.test(tag)
  )
}

function readPushPayload(event: PushEvent): unknown {
  try {
    return event.data?.json() ?? null
  } catch {
    return null
  }
}

function showPushNotification(payload: unknown): Promise<void> {
  if (!isBoosterFullPush(payload)) {
    return self.registration.showNotification(FALLBACK_TITLE, {
      body: FALLBACK_BODY,
      icon: NOTIFICATION_ICON,
      badge: NOTIFICATION_ICON,
      data: { url: FALLBACK_URL },
    })
  }
  const options: TaggedNotificationOptions = {
    body: payload.body,
    tag: payload.tag,
    renotify: false,
    icon: NOTIFICATION_ICON,
    badge: NOTIFICATION_ICON,
    data: { url: payload.url },
  }
  return self.registration.showNotification(payload.title, options)
}

function notificationTarget(notification: Notification): string {
  const data: unknown = notification.data
  if (typeof data !== 'object' || data === null) return FALLBACK_URL
  const { url } = data as Record<string, unknown>
  if (typeof url !== 'string') return FALLBACK_URL
  return url === FALLBACK_URL || LEAGUE_URL_PATTERN.test(url) ? url : FALLBACK_URL
}

async function focusClient(client: WindowClient): Promise<boolean> {
  try {
    await client.focus()
    return true
  } catch {
    return false
  }
}

async function navigateClient(client: WindowClient, href: string): Promise<boolean> {
  if (client.url === href) return focusClient(client)
  try {
    const navigated = await client.navigate(href)
    if (navigated === null) return false
    await focusClient(navigated)
    return true
  } catch {
    return false
  }
}

/** Opens the target in a tab this worker controls (navigate, then focus) or in a new window. */
async function openNotificationTarget(url: string): Promise<void> {
  const href = new URL(url, self.location.origin).href
  const controlled = await self.clients.matchAll({ type: 'window' })
  const client = controlled.find(
    (candidate) => new URL(candidate.url).origin === self.location.origin,
  )
  if (client && (await navigateClient(client, href))) return
  await self.clients.openWindow(href)
}

self.addEventListener('push', (event) => {
  event.waitUntil(showPushNotification(readPushPayload(event)))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(openNotificationTarget(notificationTarget(event.notification)))
})

serwist.addEventListeners()
