import { thumbHashToDataURL } from 'thumbhash'

const cache = new Map<string, string | null>()

function decodeBase64(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(normalized)
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}

function decode(thumbhash: string): string | null {
  try {
    return thumbHashToDataURL(decodeBase64(thumbhash))
  } catch {
    return null
  }
}

/** Returns a cached data URL for a base64 thumbhash, or null when it cannot be decoded. */
export function useThumbhashUrl(thumbhash: string): string | null {
  const cached = cache.get(thumbhash)
  if (cached !== undefined) return cached
  const url = decode(thumbhash)
  cache.set(thumbhash, url)
  return url
}
