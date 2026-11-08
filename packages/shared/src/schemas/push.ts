import { z } from 'zod'
import { isAllowedPushEndpoint, PUSH_ENDPOINT_MAX_LENGTH } from '../domain'

const B64URL = /^[A-Za-z0-9_-]+=*$/

export const pushSubscriptionBodySchema = z.object({
  endpoint: z.string().max(PUSH_ENDPOINT_MAX_LENGTH).refine(isAllowedPushEndpoint),
  keys: z.object({
    p256dh: z.string().min(1).max(256).regex(B64URL),
    auth: z.string().min(1).max(64).regex(B64URL),
  }),
})

export type PushSubscriptionBody = z.infer<typeof pushSubscriptionBodySchema>

export const pushUnsubscribeBodySchema = z.object({
  endpoint: z.string().max(PUSH_ENDPOINT_MAX_LENGTH),
})

export const pushConfigSchema = z.object({ publicKey: z.string().nullable() })

export type PushConfig = z.infer<typeof pushConfigSchema>

export const boosterFullPushPayloadSchema = z.object({
  v: z.literal(1),
  title: z.string(),
  body: z.string(),
  url: z.string().regex(/^\/l\/[0-9a-f-]{36}$/),
  tag: z.string(),
})

export type BoosterFullPushPayload = z.infer<typeof boosterFullPushPayloadSchema>

export const BOOSTER_FULL_SCAN_JOB = 'push.booster-full-scan'

export const BOOSTER_FULL_SCAN_QUEUE_OPTIONS = { policy: 'exclusive' } as const

export const BOOSTER_FULL_SCAN_RETRY_OPTIONS = { retryLimit: 0, expireInSeconds: 120 } as const
