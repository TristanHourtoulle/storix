import type { PushSubscriptionBody } from '@storix/shared'
import { STORAGE_KEYS, readStorage, removeStorage, writeStorage } from '@/lib/storage'

const RESAVE_AFTER_MS = 24 * 60 * 60 * 1000

interface SavedDevice {
  digest: string
  savedAt: number
}

function isSavedDevice(value: unknown): value is SavedDevice {
  if (typeof value !== 'object' || value === null) return false
  const { digest, savedAt } = value as Record<string, unknown>
  return typeof digest === 'string' && typeof savedAt === 'number' && Number.isFinite(savedAt)
}

function readSavedDevice(): SavedDevice | null {
  const raw = readStorage(STORAGE_KEYS.pushSavedDevice)
  if (raw === null) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    return isSavedDevice(parsed) ? parsed : null
  } catch {
    return null
  }
}

async function digestOf(userId: string, body: PushSubscriptionBody): Promise<string | null> {
  if (typeof crypto === 'undefined' || !('subtle' in crypto)) return null
  const text = JSON.stringify([userId, body.endpoint, body.keys.p256dh, body.keys.auth])
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

/** True when this exact subscription was stored for this user less than a day ago. */
export async function wasSavedRecently(
  userId: string,
  body: PushSubscriptionBody,
): Promise<boolean> {
  const saved = readSavedDevice()
  const age = Date.now() - (saved?.savedAt ?? 0)
  if (!saved || age < 0 || age >= RESAVE_AFTER_MS) return false
  const digest = await digestOf(userId, body).catch(() => null)
  return digest !== null && saved.digest === digest
}

/** Records that the server holds this subscription for this user. */
export async function rememberSavedDevice(
  userId: string,
  body: PushSubscriptionBody,
): Promise<void> {
  const digest = await digestOf(userId, body).catch(() => null)
  if (digest === null) {
    forgetSavedDevice()
    return
  }
  const saved: SavedDevice = { digest, savedAt: Date.now() }
  writeStorage(STORAGE_KEYS.pushSavedDevice, JSON.stringify(saved))
}

/** Forgets the stored subscription marker, so the next refresh re-sends it. */
export function forgetSavedDevice(): void {
  removeStorage(STORAGE_KEYS.pushSavedDevice)
}
