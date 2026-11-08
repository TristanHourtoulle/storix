import dns, { type LookupAddress, type LookupOptions } from 'node:dns'
import https from 'node:https'
import { BlockList, isIP, type LookupFunction } from 'node:net'
import { parse as legacyParseUrl } from 'node:url'
import { isAllowedPushEndpoint, type BoosterFullPushPayload } from '@storix/shared'
import webpush, { WebPushError, type PushSubscription, type RequestOptions } from 'web-push'
import type { WorkerLogger } from './logger'

export type PushSendResult = 'sent' | 'gone' | 'failed'

export interface PushTarget {
  endpoint: string
  p256dh: string
  auth: string
}

export interface PushSender {
  send(target: PushTarget, payload: BoosterFullPushPayload): Promise<PushSendResult>
}

export interface VapidConfig {
  publicKey: string
  privateKey: string
  subject: string
}

export type PushTransport = (
  subscription: PushSubscription,
  body: string,
  options: RequestOptions,
) => Promise<unknown>

const PUSH_TTL_SECONDS = 43_200
const PUSH_TIMEOUT_MS = 10_000
const GONE_STATUS_CODES: ReadonlySet<number> = new Set([404, 410])
const REFUSED_ADDRESS_CODE = 'EPUSHADDR'

const NON_PUBLIC_RANGES: readonly (readonly [string, number, 'ipv4' | 'ipv6'])[] = [
  ['0.0.0.0', 8, 'ipv4'],
  ['10.0.0.0', 8, 'ipv4'],
  ['100.64.0.0', 10, 'ipv4'],
  ['127.0.0.0', 8, 'ipv4'],
  ['169.254.0.0', 16, 'ipv4'],
  ['172.16.0.0', 12, 'ipv4'],
  ['192.0.0.0', 24, 'ipv4'],
  ['192.168.0.0', 16, 'ipv4'],
  ['198.18.0.0', 15, 'ipv4'],
  ['224.0.0.0', 3, 'ipv4'],
  ['::', 127, 'ipv6'],
  ['64:ff9b::', 96, 'ipv6'],
  ['fc00::', 7, 'ipv6'],
  ['fe80::', 10, 'ipv6'],
  ['ff00::', 8, 'ipv6'],
]

const nonPublicAddresses = NON_PUBLIC_RANGES.reduce((list, [network, prefix, family]) => {
  list.addSubnet(network, prefix, family)
  return list
}, new BlockList())

/** True when the IP literal is loopback, private, link-local, CGNAT, multicast or not an IP; IPv4-mapped IPv6 hits the IPv4 rules. */
export function isNonPublicAddress(address: string): boolean {
  const family = isIP(address)
  if (family === 0) return true
  return nonPublicAddresses.check(address, family === 4 ? 'ipv4' : 'ipv6')
}

function refusedAddressError(): NodeJS.ErrnoException {
  return Object.assign(new Error('Refused a non-public push service address'), {
    code: REFUSED_ADDRESS_CODE,
  })
}

/** DNS lookup for push connections that fails when any resolved address is not publicly routable. */
export const publicOnlyLookup: LookupFunction = (hostname, options: LookupOptions, callback) => {
  dns.lookup(hostname, { ...options, all: true }, (error, addresses: LookupAddress[]) => {
    if (error) {
      callback(error, '', 0)
      return
    }
    const first = addresses[0]
    if (first === undefined || addresses.some(({ address }) => isNonPublicAddress(address))) {
      callback(refusedAddressError(), '', 0)
      return
    }
    if (options.all === true) callback(null, addresses)
    else callback(null, first.address, first.family)
  })
}

/** True when the endpoint passes the allowlist and both URL parsers agree on a non-empty host. */
export function isSendablePushEndpoint(endpoint: string): boolean {
  if (!isAllowedPushEndpoint(endpoint)) return false
  const legacyHost = legacyParseUrl(endpoint).hostname
  if (legacyHost === null || legacyHost === '') return false
  return URL.canParse(endpoint) && legacyHost === new URL(endpoint).hostname
}

function errorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('code' in error)) return undefined
  return typeof error.code === 'string' ? error.code : undefined
}

const publicOnlyAgent = new https.Agent({ lookup: publicOnlyLookup, keepAlive: true })

const webPushTransport: PushTransport = (subscription, body, options) =>
  webpush.sendNotification(subscription, body, options)

/**
 * Creates the Web Push sender. Every send re-checks the endpoint (allowlist, then legacy and WHATWG parsers agreeing on a
 * non-empty host) and connects only to public addresses; a refused endpoint is reported as `gone` so its row is deleted.
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
        return 'gone'
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
