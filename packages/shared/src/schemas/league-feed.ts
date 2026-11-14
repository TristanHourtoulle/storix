import { z } from 'zod'
import { FEED_FILTER_IDS, LEAGUE_EVENT_TYPES } from '../domain'
import { cardTierSchema, collectionCardSchema } from './cards'
import { storedCharmIdSchema } from './charms'
import { isoDateSchema } from './common'
import { emblemIdSchema } from './emblems'
import { goalTypeSchema } from './league-goal'

export const FEED_DEFAULT_LIMIT = 20
export const FEED_MAX_LIMIT = 50
export const FEED_THUMBS = 3

const FEED_CURSOR_PATTERN =
  /^(\d{1,15})\.([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/

export interface FeedCursor {
  atMs: number
  id: string
}

/** Encodes an event's position as an opaque feed cursor. */
export function encodeFeedCursor(cursor: FeedCursor): string {
  return `${cursor.atMs}.${cursor.id}`
}

/** Parses a feed cursor, or returns null when it is malformed. */
export function parseFeedCursor(raw: string): FeedCursor | null {
  const match = FEED_CURSOR_PATTERN.exec(raw)
  if (match === null) return null
  const [, ms = '', id = ''] = match
  return { atMs: Number(ms), id }
}

export const feedCursorSchema = z.string().transform((raw, ctx) => {
  const cursor = parseFeedCursor(raw)
  if (cursor === null) {
    ctx.issues.push({ code: 'custom', message: 'Invalid feed cursor', input: raw })
    return z.NEVER
  }
  return cursor
})

export const feedFilterSchema = z.enum(FEED_FILTER_IDS)
export const leagueEventTypeSchema = z.enum(LEAGUE_EVENT_TYPES)

export const feedQuerySchema = z.object({
  filter: feedFilterSchema.default('all'),
  cursor: feedCursorSchema.optional(),
  limit: z.coerce.number().int().min(1).max(FEED_MAX_LIMIT).default(FEED_DEFAULT_LIMIT),
})

export const feedActorSchema = z.object({
  userId: z.string().nullable(),
  displayUsername: z.string().nullable(),
})

export const feedGoalSchema = z.object({
  type: goalTypeSchema,
  target: z.int().min(1),
  progress: z.int().min(0),
})

export const feedRowSchema = z.object({
  id: z.uuid(),
  kind: leagueEventTypeSchema,
  actors: z.array(feedActorSchema).min(1),
  count: z.int().min(1),
  card: collectionCardSchema.nullable(),
  thumbs: z.array(collectionCardSchema).max(FEED_THUMBS),
  tier: cardTierSchema.nullable(),
  isPremium: z.boolean(),
  isDiscovery: z.boolean(),
  charm: storedCharmIdSchema,
  fromTier: cardTierSchema.nullable(),
  toTier: cardTierSchema.nullable(),
  emblemIds: z.array(emblemIdSchema),
  goal: feedGoalSchema.nullable(),
  bravoCount: z.int().min(0),
  hasBravoed: z.boolean(),
  isNew: z.boolean(),
  at: isoDateSchema,
})

export const feedPageSchema = z.object({
  rows: z.array(feedRowSchema),
  nextCursor: z.string().nullable(),
  lastSeenAt: isoDateSchema.nullable(),
})

export const feedHighlightSchema = z.object({
  eventId: z.uuid(),
  actor: feedActorSchema,
  card: collectionCardSchema.nullable(),
  toTier: cardTierSchema,
  bravoCount: z.int().min(0),
  hasBravoed: z.boolean(),
  at: isoDateSchema,
})

export const feedHighlightsSchema = z.object({
  highlights: z.array(feedHighlightSchema),
})

export const feedEventParamsSchema = z.object({
  leagueId: z.uuid(),
  eventId: z.uuid(),
})

export const feedBravoSchema = z.object({
  bravoCount: z.int().min(0),
  hasBravoed: z.boolean(),
})

export type FeedBravo = z.infer<typeof feedBravoSchema>
export type FeedQuery = z.infer<typeof feedQuerySchema>
export type FeedActor = z.infer<typeof feedActorSchema>
export type FeedRow = z.infer<typeof feedRowSchema>
export type FeedPage = z.infer<typeof feedPageSchema>
export type FeedHighlight = z.infer<typeof feedHighlightSchema>
export type FeedHighlights = z.infer<typeof feedHighlightsSchema>
