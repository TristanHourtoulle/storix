import { z } from 'zod'
import { cardTierSchema, collectionCardSchema, copyVariantSchema } from './cards'
import { isoDateSchema } from './common'

export const BOOSTER_HISTORY_DEFAULT_LIMIT = 20
export const BOOSTER_HISTORY_MAX_LIMIT = 50

const BOOSTER_HISTORY_CURSOR_PATTERN =
  /^(\d{1,15})\.([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/

export interface BoosterHistoryCursor {
  openedAtMs: number
  id: string
}

/** Encodes an opening's position as an opaque booster history cursor. */
export function encodeBoosterHistoryCursor(cursor: BoosterHistoryCursor): string {
  return `${cursor.openedAtMs}.${cursor.id}`
}

/** Parses a booster history cursor, or returns null when it is malformed. */
export function parseBoosterHistoryCursor(raw: string): BoosterHistoryCursor | null {
  const match = BOOSTER_HISTORY_CURSOR_PATTERN.exec(raw)
  if (match === null) return null
  const [, ms = '', id = ''] = match
  return { openedAtMs: Number(ms), id }
}

export const boosterHistoryCursorSchema = z.string().transform((raw, ctx) => {
  const cursor = parseBoosterHistoryCursor(raw)
  if (cursor === null) {
    ctx.issues.push({ code: 'custom', message: 'Invalid booster history cursor', input: raw })
    return z.NEVER
  }
  return cursor
})

export const boosterHistoryQuerySchema = z.object({
  cursor: boosterHistoryCursorSchema.optional(),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(BOOSTER_HISTORY_MAX_LIMIT)
    .default(BOOSTER_HISTORY_DEFAULT_LIMIT),
})

export const boosterHistoryPullSchema = z.object({
  slot: z.int().min(0).max(4),
  tierAtMint: cardTierSchema,
  variant: copyVariantSchema,
  outcome: z.enum(['new', 'upgraded', 'duplicate']),
  dust: z.int().min(0),
  stackCount: z.int().positive().nullable(),
  isDiscovery: z.boolean(),
  card: collectionCardSchema.nullable(),
})

export const boosterHistoryOpeningSchema = z.object({
  id: z.uuid(),
  openedAt: isoDateSchema,
  isPremium: z.boolean(),
  pulls: z.array(boosterHistoryPullSchema).max(5),
})

export const boosterHistoryStatsSchema = z.object({
  openedCount: z.int().min(0),
  premiumCount: z.int().min(0),
  bestPull: z
    .object({
      tierAtMint: cardTierSchema,
      variant: copyVariantSchema,
      card: collectionCardSchema.nullable(),
    })
    .nullable(),
  boostersSinceLegendary: z.int().min(0).nullable(),
})

export const boosterHistoryPageSchema = z.object({
  stats: boosterHistoryStatsSchema.nullable(),
  openings: z.array(boosterHistoryOpeningSchema).max(BOOSTER_HISTORY_MAX_LIMIT),
  nextCursor: z.string().nullable(),
})

export type BoosterHistoryQuery = z.infer<typeof boosterHistoryQuerySchema>
export type BoosterHistoryPull = z.infer<typeof boosterHistoryPullSchema>
export type BoosterHistoryOpening = z.infer<typeof boosterHistoryOpeningSchema>
export type BoosterHistoryStats = z.infer<typeof boosterHistoryStatsSchema>
export type BoosterHistoryPage = z.infer<typeof boosterHistoryPageSchema>
