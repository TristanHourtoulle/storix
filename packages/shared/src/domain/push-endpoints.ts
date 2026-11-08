export const PUSH_ENDPOINT_MAX_LENGTH = 2048

const EXACT_PUSH_HOSTS: ReadonlySet<string> = new Set([
  'fcm.googleapis.com',
  'web.push.apple.com',
  'updates.push.services.mozilla.com',
  'push.services.mozilla.com',
])

const PUSH_HOST_SUFFIXES: readonly string[] = ['.notify.windows.com', '.push.apple.com']

function isAllowedPushHost(hostname: string): boolean {
  return (
    EXACT_PUSH_HOSTS.has(hostname) || PUSH_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix))
  )
}

/** True when the endpoint is an https URL on a known push service, with no userinfo and no explicit port. */
export function isAllowedPushEndpoint(endpoint: string): boolean {
  if (endpoint.length > PUSH_ENDPOINT_MAX_LENGTH) return false
  if (!URL.canParse(endpoint)) return false
  const url = new URL(endpoint)
  if (url.protocol !== 'https:') return false
  if (url.username !== '' || url.password !== '' || url.port !== '') return false
  return isAllowedPushHost(url.hostname)
}
