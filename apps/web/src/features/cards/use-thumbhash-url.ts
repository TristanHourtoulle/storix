import { useMemo } from 'react'
import { thumbHashToDataURL } from 'thumbhash'

function decodeBase64(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(normalized)
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}

/** Returns a memoized data URL for a base64 thumbhash, or null when it cannot be decoded. */
export function useThumbhashUrl(thumbhash: string): string | null {
  return useMemo(() => {
    try {
      return thumbHashToDataURL(decodeBase64(thumbhash))
    } catch {
      return null
    }
  }, [thumbhash])
}
