function hasControlOrWhitespace(value: string): boolean {
  return [...value].some(
    (char) => char.charCodeAt(0) <= 0x1f || char.charCodeAt(0) === 0x7f || /\s/.test(char),
  )
}

/** True when the value is a same-origin absolute path (single leading slash, no backslash tricks). */
export function isSafeRedirectPath(value: string): boolean {
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return false
  if (hasControlOrWhitespace(value)) return false
  try {
    return new URL(value, window.location.origin).origin === window.location.origin
  } catch {
    return false
  }
}

const PUBLIC_PREFIXES = ['/login', '/join/', '/reset'] as const

/** True for screens reachable without a session. */
export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix))
}
