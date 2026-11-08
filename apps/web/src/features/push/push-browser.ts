import type { PushSubscriptionBody } from '@storix/shared'
import { logger } from '@/lib/logger'
import { removePushSubscription, savePushSubscription } from './push.api'
import { forgetSavedDevice, rememberSavedDevice, wasSavedRecently } from './push-saved-device'

const SERVER_REMOVE_TIMEOUT_MS = 4000
const SERVER_SAVE_TIMEOUT_MS = 8000
const SERVICE_WORKER_READY_TIMEOUT_MS = 10000

let deviceQueue: Promise<unknown> = Promise.resolve()

function runInDeviceQueue<T>(task: () => Promise<T>): Promise<T> {
  const run = deviceQueue.then(task, task)
  deviceQueue = run.catch(() => undefined)
  return run
}

/** True when this browser exposes service workers, the Push API and notifications. */
export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

/** Decodes a base64url VAPID key into the bytes `pushManager.subscribe` expects. */
export function urlBase64ToUint8Array(value: string): Uint8Array<ArrayBuffer> {
  const padded = value.padEnd(value.length + ((4 - (value.length % 4)) % 4), '=')
  const binary = window.atob(padded.replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}

/** Converts a browser subscription into the api body; throws when keys are missing. */
export function toPushSubscriptionBody(subscription: PushSubscription): PushSubscriptionBody {
  const { endpoint, keys } = subscription.toJSON()
  const p256dh = keys?.p256dh
  const auth = keys?.auth
  if (!endpoint || !p256dh || !auth) throw new Error('Push subscription keys are missing')
  return { endpoint, keys: { p256dh, auth } }
}

/** This device's push subscription, or null when there is none or no service worker. */
export async function getCurrentSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null
  const registration = await navigator.serviceWorker.getRegistration()
  return (await registration?.pushManager.getSubscription()) ?? null
}

function serviceWorkerReady(): Promise<ServiceWorkerRegistration> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error('Service worker is not ready'))
    }, SERVICE_WORKER_READY_TIMEOUT_MS)
    navigator.serviceWorker.ready.then(
      (registration) => {
        window.clearTimeout(timer)
        resolve(registration)
      },
      (error: unknown) => {
        window.clearTimeout(timer)
        reject(error instanceof Error ? error : new Error('Service worker failed'))
      },
    )
  })
}

function hasApplicationServerKey(subscription: PushSubscription, publicKey: string): boolean {
  const current = subscription.options.applicationServerKey
  if (current === null) return true
  const expected = urlBase64ToUint8Array(publicKey)
  const actual = new Uint8Array(current)
  return (
    actual.length === expected.length && actual.every((byte, index) => byte === expected[index])
  )
}

async function storeSubscription(
  body: PushSubscriptionBody,
  userId: string | undefined,
): Promise<void> {
  await savePushSubscription(body, AbortSignal.timeout(SERVER_SAVE_TIMEOUT_MS))
  if (userId === undefined) forgetSavedDevice()
  else await rememberSavedDevice(userId, body)
}

async function removeSubscription(subscription: PushSubscription): Promise<void> {
  forgetSavedDevice()
  try {
    await removePushSubscription(
      subscription.endpoint,
      AbortSignal.timeout(SERVER_REMOVE_TIMEOUT_MS),
    )
  } catch (error) {
    logger.warn('Push subscription server removal failed', { error })
  }
  await subscription.unsubscribe()
}

/**
 * Asks for permission and subscribes this device.
 * Must be called synchronously from a tap handler: the permission request is its first call.
 */
export async function subscribeThisDevice(publicKey: string): Promise<PushSubscriptionBody> {
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('denied')
  const registration = await serviceWorkerReady()
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  })
  return toPushSubscriptionBody(subscription)
}

/** Stores a fresh subscription on the server, ordered with the other device writes. */
export function saveThisDevice(
  body: PushSubscriptionBody,
  userId: string | undefined,
): Promise<void> {
  return runInDeviceQueue(() => storeSubscription(body, userId))
}

/**
 * Re-sends the current subscription when its endpoint, keys or user changed, or once a day.
 * Drops it when it was made with another VAPID key. Resolves false when this device ends up unsubscribed.
 */
export function refreshThisDevice(publicKey: string, userId: string | undefined): Promise<boolean> {
  return runInDeviceQueue(async () => {
    const subscription = await getCurrentSubscription()
    if (!subscription) return false
    if (!hasApplicationServerKey(subscription, publicKey)) {
      await removeSubscription(subscription)
      return false
    }
    const body = toPushSubscriptionBody(subscription)
    if (userId !== undefined && (await wasSavedRecently(userId, body))) return true
    await storeSubscription(body, userId)
    return true
  })
}

/** Removes the subscription on the server (best effort), then always on this device. */
export function unsubscribeThisDevice(): Promise<void> {
  return runInDeviceQueue(async () => {
    const subscription = await getCurrentSubscription()
    if (subscription) await removeSubscription(subscription)
  })
}

/** Removes the subscription on this device only, for when the session is already gone. */
export async function dropLocalSubscription(): Promise<void> {
  forgetSavedDevice()
  const subscription = await getCurrentSubscription()
  await subscription?.unsubscribe()
}
