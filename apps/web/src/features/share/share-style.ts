import { STORAGE_KEYS, readStorage, writeStorage } from '@/lib/storage'
import type { ShareStyle } from './share-subject'

function isShareStyle(value: string | null, available: readonly ShareStyle[]): value is ShareStyle {
  return available.some((style) => style === value)
}

/** Reads the remembered share style, falling back to Flex (or the first available style). */
export function readShareStyle(available: readonly ShareStyle[]): ShareStyle {
  const stored = readStorage(STORAGE_KEYS.shareStyle)
  if (isShareStyle(stored, available)) return stored
  if (available.includes('flex')) return 'flex'
  return available[0] ?? 'card'
}

/** Remembers the share style on this device. */
export function writeShareStyle(style: ShareStyle): void {
  writeStorage(STORAGE_KEYS.shareStyle, style)
}
