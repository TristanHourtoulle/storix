import type { IncomingHttpHeaders } from 'node:http'
import type { Env } from './env'

const TRUSTED_PROXY_HOPS = 2

export interface ClientIpPolicy {
  trustProxy: boolean | ((address: string, hop: number) => boolean)
  ipAddressHeaders: string[]
}

/** Returns how the client IP is resolved: the Railway edge and CDN hops are trusted in production, none in development. */
export function clientIpPolicy(env: Env): ClientIpPolicy {
  return env.NODE_ENV === 'production'
    ? {
        trustProxy: (_address, hop) => hop < TRUSTED_PROXY_HOPS,
        ipAddressHeaders: ['x-real-ip'],
      }
    : { trustProxy: false, ipAddressHeaders: [] }
}

function firstHeaderValue(value: string | string[] | undefined): string | null {
  const raw = Array.isArray(value) ? value[0] : value
  const trimmed = raw?.trim()
  return trimmed === undefined || trimmed === '' ? null : trimmed
}

/**
 * Builds the rate-limit key from the same edge-overwritten headers Better Auth reads,
 * falling back to the Fastify-resolved IP when none is set (always in development).
 */
export function rateLimitKeyGenerator(
  env: Env,
): (request: { headers: IncomingHttpHeaders; ip: string }) => string {
  const { ipAddressHeaders } = clientIpPolicy(env)
  return (request) =>
    ipAddressHeaders
      .map((name) => firstHeaderValue(request.headers[name]))
      .find((value) => value !== null) ?? request.ip
}
