/** True when the value is a same-origin absolute path (single leading slash, no backslash tricks). */
export function isSafeRedirectPath(value: string): boolean {
  return value.startsWith('/') && !value.startsWith('//') && !value.startsWith('/\\')
}

const PUBLIC_PREFIXES = ['/login', '/join/', '/reset'] as const

/** True for screens reachable without a session. */
export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix))
}
