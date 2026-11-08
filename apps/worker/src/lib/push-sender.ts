import https from 'node:https'
import { parse as legacyParseUrl } from 'node:url'
import { isAllowedPushEndpoint } from '@storix/shared'
import webpush, { WebPushError, type PushSubscription, type RequestOptions } from 'web-push'
import type { WorkerLogger } from './logger'
import { publicOnlyLookup } from './public-address'
import type { PushSender, VapidConfig } from './push-sender.types'

export type PushTransport = (
  subscription: PushSubscription,
  body: string,
  options: RequestOptions,
) => Promise<unknown>

const PUSH_TTL_SECONDS = 43_200
const PUSH_TIMEOUT_MS = 10_000
const GONE_STATUS_CODES: ReadonlySet<number> = new Set([404, 410])

/**
 * True when the endpoint passes the allowlist and the legacy parser used by web-push reads the same non-empty host
 * as WHATWG, with no port and no userinfo.
 */
export function isSendablePushEndpoint(endpoint: string): boolean {
  if (!isAllowedPushEndpoint(endpoint) || !URL.canParse(endpoint)) return false
  const legacy = legacyParseUrl(endpoint)
  if (legacy.hostname === null || legacy.hostname === '') return false
  if (legacy.port !== null || legacy.auth !== null) return false
  return legacy.hostname === new URL(endpoint).hostname
}

function errorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('code' in error)) return undefined
  return typeof error.code === 'string' ? error.code : undefined
}

const publicOnlyAgent = new https.Agent({ lookup: publicOnlyLookup, keepAlive: false })

const webPushTransport: PushTransport = (subscription, body, options) =>
  webpush.sendNotification(subscription, body, options)

/**
 * Creates the Web Push sender. Every send re-checks the endpoint (allowlist, then legacy and WHATWG parsers agreeing on a
 * non-empty host) and connects only to public addresses over a fresh socket; a refused endpoint returns `refused`.
 * `transport` exists for local verification only; production uses web-push.
 */
export function createPushSender(
  vapid: VapidConfig,
  logger: WorkerLogger,
  transport: PushTransport = webPushTransport,
): PushSender {
  const vapidDetails = {
    subject: vapid.subject,
    publicKey: vapid.publicKey,
    privateKey: vapid.privateKey,
  }

  return {
    async send(target, payload) {
      if (!isSendablePushEndpoint(target.endpoint)) {
        logger.warn('Refused a push endpoint that fails the send guard')
        return 'refused'
      }
      try {
        await transport(
          { endpoint: target.endpoint, keys: { p256dh: target.p256dh, auth: target.auth } },
          JSON.stringify(payload),
          {
            vapidDetails,
            TTL: PUSH_TTL_SECONDS,
            urgency: 'normal',
            timeout: PUSH_TIMEOUT_MS,
            agent: publicOnlyAgent,
          },
        )
        return 'sent'
      } catch (error) {
        if (error instanceof WebPushError && GONE_STATUS_CODES.has(error.statusCode)) return 'gone'
        const statusCode = error instanceof WebPushError ? error.statusCode : undefined
        logger.warn({ statusCode, code: errorCode(error) }, 'Push send failed')
        return 'failed'
      }
    },
  }
}
