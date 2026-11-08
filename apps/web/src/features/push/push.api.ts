import { pushConfigSchema, type PushConfig, type PushSubscriptionBody } from '@storix/shared'
import { apiRequest, apiRequestVoid } from '@/lib/http'

/** Fetches the VAPID public key, null when push is disabled on the server. */
export function fetchPushConfig(): Promise<PushConfig> {
  return apiRequest('/api/push/config', { schema: pushConfigSchema })
}

/** Stores or refreshes this device's push subscription. */
export function savePushSubscription(body: PushSubscriptionBody): Promise<void> {
  return apiRequestVoid('/api/push/subscriptions', { method: 'PUT', body })
}

/** Removes this device's push subscription from the server. */
export function removePushSubscription(endpoint: string, signal?: AbortSignal): Promise<void> {
  return apiRequestVoid('/api/push/subscriptions/remove', {
    method: 'POST',
    body: { endpoint },
    signal,
  })
}
