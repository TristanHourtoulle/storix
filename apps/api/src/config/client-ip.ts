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
