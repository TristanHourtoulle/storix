import { mediaCacheKey } from '@storix/shared/domain'
import {
  CacheableResponsePlugin,
  CacheFirst,
  ExpirationPlugin,
  NavigationRoute,
  Serwist,
  StaleWhileRevalidate,
} from 'serwist'
import { API_CACHE_NAME, MEDIA_CACHE_NAME } from './features/pwa/cache-names'

const CARD_READ_PATTERN = /^\/api\/leagues\/[^/]+\/cards(\/[^/]+)?$/

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
  ({ url, sameOrigin }) => sameOrigin && CARD_READ_PATTERN.test(url.pathname),
  new StaleWhileRevalidate({
    cacheName: API_CACHE_NAME,
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

serwist.addEventListeners()
