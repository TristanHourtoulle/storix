import type { PushSubscriptionBody } from '@storix/shared'
import { logger } from '@/lib/logger'
import { removePushSubscription, savePushSubscription } from './push.api'

const SERVER_REMOVE_TIMEOUT_MS = 4000
const SERVER_REFRESH_TIMEOUT_MS = 8000

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

/**
 * Asks for permission and subscribes this device.
 * Must be called synchronously from a tap handler: the permission request is its first call.
 */
export async function subscribeThisDevice(publicKey: string): Promise<PushSubscriptionBody> {
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('denied')
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  })
  return toPushSubscriptionBody(subscription)
}

/** Stores a fresh subscription on the server, ordered with the other device writes. */
export function saveThisDevice(body: PushSubscriptionBody): Promise<void> {
  return runInDeviceQueue(() => savePushSubscription(body))
}

/** Re-sends the current subscription when this device still has one (endpoint rotation). */
export function refreshThisDevice(): Promise<void> {
  return runInDeviceQueue(async () => {
    const subscription = await getCurrentSubscription()
    if (!subscription) return
    await savePushSubscription(
      toPushSubscriptionBody(subscription),
      AbortSignal.timeout(SERVER_REFRESH_TIMEOUT_MS),
    )
  })
}

/** Removes the subscription on the server (best effort), then always on this device. */
export function unsubscribeThisDevice(): Promise<void> {
  return runInDeviceQueue(async () => {
    const subscription = await getCurrentSubscription()
    if (!subscription) return
    try {
      await removePushSubscription(
        subscription.endpoint,
        AbortSignal.timeout(SERVER_REMOVE_TIMEOUT_MS),
      )
    } catch (error) {
      logger.warn('Push subscription server removal failed', { error })
    }
    await subscription.unsubscribe()
  })
}

/** Removes the subscription on this device only, for when the session is already gone. */
export async function dropLocalSubscription(): Promise<void> {
  const subscription = await getCurrentSubscription()
  await subscription?.unsubscribe()
}
