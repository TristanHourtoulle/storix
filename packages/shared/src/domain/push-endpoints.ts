export const PUSH_ENDPOINT_MAX_LENGTH = 2048

export const PUSH_SUBSCRIPTIONS_PER_USER_MAX = 10

const EXACT_PUSH_HOSTS: ReadonlySet<string> = new Set([
  'fcm.googleapis.com',
  'web.push.apple.com',
  'updates.push.services.mozilla.com',
  'push.services.mozilla.com',
])

const MAX_HOSTNAME_LENGTH = 253

const DNS_LABEL = '[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?'

const PUSH_HOST_SUFFIX_PATTERNS: readonly RegExp[] = [
  new RegExp(`^(?:${DNS_LABEL}\\.)+notify\\.windows\\.com$`),
  new RegExp(`^(?:${DNS_LABEL}\\.)+push\\.apple\\.com$`),
]

const CANONICAL_AUTHORITY_PATTERN = /^https:\/\/[a-z0-9.-]+\//

function isAllowedPushHost(hostname: string): boolean {
  if (hostname.length > MAX_HOSTNAME_LENGTH) return false
  return (
    EXACT_PUSH_HOSTS.has(hostname) ||
    PUSH_HOST_SUFFIX_PATTERNS.some((pattern) => pattern.test(hostname))
  )
}

/**
 * True when the endpoint is a canonical https URL on a known push service, with no userinfo and no port.
 * Only the exact WHATWG serialization is accepted, so legacy parsers (such as `url.parse` in web-push) read the same host.
 */
export function isAllowedPushEndpoint(endpoint: string): boolean {
  if (endpoint.length > PUSH_ENDPOINT_MAX_LENGTH) return false
  if (!CANONICAL_AUTHORITY_PATTERN.test(endpoint)) return false
  if (!URL.canParse(endpoint)) return false
  const url = new URL(endpoint)
  if (url.href !== endpoint) return false
  if (url.protocol !== 'https:') return false
  if (url.username !== '' || url.password !== '' || url.port !== '') return false
  return isAllowedPushHost(url.hostname)
}
