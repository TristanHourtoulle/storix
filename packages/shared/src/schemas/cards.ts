import { z } from 'zod'
import { CARD_TIERS } from '../domain'
import { idSchema, isoDateSchema } from './common'
import { imageSetSchema } from './media'
import { cardTitleSchema } from './uploads'

export const cardTierSchema = z.enum(CARD_TIERS)

export const cardPersonSchema = z.object({
  userId: idSchema.nullable(),
  displayUsername: z.string().nullable(),
})

export const cardSummarySchema = z.object({
  id: z.uuid(),
  number: z.int().positive(),
  title: cardTitleSchema,
  tier: cardTierSchema,
  isProvisional: z.boolean(),
  author: cardPersonSchema,
  thumbhash: z.string(),
  dominantColor: z.string().regex(/^#[0-9a-f]{6}$/),
  width: z.int().positive(),
  height: z.int().positive(),
  image: imageSetSchema,
})

export const cardDetailSchema = cardSummarySchema.extend({
  capturedAt: isoDateSchema.nullable(),
  isCaptureDateValidated: z.boolean(),
  createdAt: isoDateSchema,
  tagged: z.array(cardPersonSchema),
})

export const listCardsQuerySchema = z.object({
  authorId: idSchema.optional(),
  cursor: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(120),
})

export const cardPageSchema = z.object({
  cards: z.array(cardSummarySchema),
  nextCursor: z.int().positive().nullable(),
  total: z.int().min(0),
})

export const cardParamsSchema = z.object({ leagueId: z.uuid(), cardId: z.uuid() })

export type CardPerson = z.infer<typeof cardPersonSchema>
export type CardSummary = z.infer<typeof cardSummarySchema>
export type CardDetail = z.infer<typeof cardDetailSchema>
export type ListCardsQuery = z.infer<typeof listCardsQuerySchema>
export type CardPage = z.infer<typeof cardPageSchema>
