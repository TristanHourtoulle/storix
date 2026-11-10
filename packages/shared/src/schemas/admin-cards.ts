import { z } from 'zod'
import { BOUND_TIERS, COMPUTED_TIERS } from '../domain'
import { cardAuthorSchema, cardTierSchema } from './cards'
import { isoDateSchema } from './common'
import { imageSetSchema } from './media'
import { cardTitleSchema } from './uploads'

export const computedTierSchema = z.enum(COMPUTED_TIERS)

export const boundTierSchema = z.enum(BOUND_TIERS)

export const adminCardsQuerySchema = z.object({
  filter: z.enum(['all', 'active', 'hidden', 'provisional', 'mythic']).default('all'),
  cursor: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(60),
})

export const adminCardSchema = z.object({
  id: z.uuid(),
  number: z.int().positive(),
  title: cardTitleSchema,
  status: z.enum(['active', 'hidden']),
  tier: cardTierSchema,
  computedTier: computedTierSchema.nullable(),
  tierSource: z.enum(['computed', 'bounded', 'pinned']),
  pinnedTier: cardTierSchema.nullable(),
  minTier: boundTierSchema.nullable(),
  maxTier: boundTierSchema.nullable(),
  author: cardAuthorSchema,
  capturedAt: isoDateSchema.nullable(),
  isCaptureDateValidated: z.boolean(),
  createdAt: isoDateSchema,
  boosterEligibleAt: isoDateSchema,
  copiesInLeague: z.int().min(0),
  thumbhash: z.string(),
  dominantColor: z.string().regex(/^#[0-9a-f]{6}$/),
  width: z.int().positive(),
  height: z.int().positive(),
  image: imageSetSchema,
})

export const adminCardPageSchema = z.object({
  cards: z.array(adminCardSchema),
  nextCursor: z.int().positive().nullable(),
  mythicCount: z.int().min(0),
})

export const pinTierBodySchema = z.object({ tier: cardTierSchema.nullable() })

export const tierBoundsBodySchema = z.object({
  min: boundTierSchema.nullable(),
  max: boundTierSchema.nullable(),
})

export const captureDateValidationBodySchema = z.object({ isValidated: z.boolean() })

export const cardVisibilityBodySchema = z.object({ status: z.enum(['active', 'hidden']) })

export type AdminCardsQuery = z.infer<typeof adminCardsQuerySchema>
export type AdminCard = z.infer<typeof adminCardSchema>
export type AdminCardPage = z.infer<typeof adminCardPageSchema>
export type PinTierBody = z.infer<typeof pinTierBodySchema>
export type TierBoundsBody = z.infer<typeof tierBoundsBodySchema>
export type CaptureDateValidationBody = z.infer<typeof captureDateValidationBodySchema>
export type CardVisibilityBody = z.infer<typeof cardVisibilityBodySchema>
