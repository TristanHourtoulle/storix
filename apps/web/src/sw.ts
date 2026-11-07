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

const OFFLINE_READ_PATTERN = /^\/api\/(me|leagues\/[^/]+(\/cards(\/[^/]+)?)?)$/
const API_NETWORK_TIMEOUT_SECONDS = 3

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

serwist.addEventListeners()
