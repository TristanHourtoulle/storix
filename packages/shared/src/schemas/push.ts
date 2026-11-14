import { z } from 'zod'
import { isAllowedPushEndpoint, PUSH_ENDPOINT_MAX_LENGTH } from '../domain'

const B64URL = /^[A-Za-z0-9_-]+=*$/

const LEAGUE_ID_PATTERN = '[0-9a-f-]{36}'

export const pushSubscriptionBodySchema = z.object({
  endpoint: z.string().max(PUSH_ENDPOINT_MAX_LENGTH).refine(isAllowedPushEndpoint),
  keys: z.object({
    p256dh: z.string().min(87).max(88).regex(B64URL),
    auth: z.string().min(22).max(24).regex(B64URL),
  }),
})

export type PushSubscriptionBody = z.infer<typeof pushSubscriptionBodySchema>

export const pushUnsubscribeBodySchema = z.object({
  endpoint: z.string().min(1).max(PUSH_ENDPOINT_MAX_LENGTH),
})

export const pushConfigSchema = z.object({ publicKey: z.string().nullable() })

export type PushConfig = z.infer<typeof pushConfigSchema>

export const PUSH_TAG_KINDS = ['booster-full', 'moment', 'event', 'event-end'] as const

/** Payload of every web push: a league page, optionally one of its series, and a tag per kind of notice. */
export const pushPayloadSchema = z.object({
  v: z.literal(1),
  title: z.string().max(64),
  body: z.string().max(512),
  url: z.string().regex(new RegExp(`^/l/${LEAGUE_ID_PATTERN}(/series/${LEAGUE_ID_PATTERN})?$`)),
  tag: z.string().regex(new RegExp(`^(${PUSH_TAG_KINDS.join('|')}):${LEAGUE_ID_PATTERN}$`)),
})

export type PushPayload = z.infer<typeof pushPayloadSchema>

export const BOOSTER_FULL_SCAN_JOB = 'push.booster-full-scan'

export const MOMENTS_TICK_JOB = 'moments.tick'

export const MOMENTS_TICK_QUEUE_OPTIONS = { policy: 'exclusive' } as const

export const MOMENTS_TICK_RETRY_OPTIONS = {
  retryLimit: 1,
  retryDelay: 15,
  expireInSeconds: 120,
} as const

export const BOOSTER_FULL_SCAN_QUEUE_OPTIONS = { policy: 'exclusive' } as const

export const BOOSTER_FULL_SCAN_RETRY_OPTIONS = { retryLimit: 0, expireInSeconds: 120 } as const
