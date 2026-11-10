import { z } from 'zod'
import { cardTierSchema, collectionCardSchema, copyVariantSchema } from './cards'
import { isoDateSchema } from './common'

export const BOOSTER_HISTORY_DEFAULT_LIMIT = 20
export const BOOSTER_HISTORY_MAX_LIMIT = 50

export const boosterHistoryCursorSchema = z.string().regex(/^\d{1,15}\.[0-9a-f-]{36}$/)

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
  nextCursor: boosterHistoryCursorSchema.nullable(),
})

export type BoosterHistoryQuery = z.infer<typeof boosterHistoryQuerySchema>
export type BoosterHistoryPull = z.infer<typeof boosterHistoryPullSchema>
export type BoosterHistoryOpening = z.infer<typeof boosterHistoryOpeningSchema>
export type BoosterHistoryStats = z.infer<typeof boosterHistoryStatsSchema>
export type BoosterHistoryPage = z.infer<typeof boosterHistoryPageSchema>
