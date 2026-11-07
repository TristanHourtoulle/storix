import { z } from 'zod'
import { isoDateSchema } from './common'

export const removedCardsQuerySchema = z.object({
  since: isoDateSchema.optional(),
  after: z.uuid().optional(),
})

export const removedCardSchema = z.object({
  cardId: z.uuid(),
  number: z.int().positive(),
  mediaPrefix: z.string().regex(/^img\/[0-9a-f-]{36}\/[0-9a-f]{64}\/$/),
  removedAt: isoDateSchema,
  compensation: z.int().min(0),
})

export const removedCardsSchema = z.object({
  removed: z.array(removedCardSchema).max(500),
  cursor: isoDateSchema,
  after: z.uuid().nullable(),
  hasMore: z.boolean(),
})

export type RemovedCardsQuery = z.infer<typeof removedCardsQuerySchema>
export type RemovedCard = z.infer<typeof removedCardSchema>
export type RemovedCards = z.infer<typeof removedCardsSchema>
