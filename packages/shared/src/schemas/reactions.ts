import { z } from 'zod'
import { REACTION_TYPES } from '../domain'
import { cardParamsSchema, cardPersonSchema, reactionCountsSchema } from './cards'
import { isoDateSchema } from './common'

export const reactionTypeSchema = z.enum(REACTION_TYPES)

export const reactionParamsSchema = cardParamsSchema.extend({ type: reactionTypeSchema })

export type ReactionParams = z.infer<typeof reactionParamsSchema>

export const cardReactorSchema = z.object({
  person: cardPersonSchema,
  types: z.array(reactionTypeSchema).min(1).max(REACTION_TYPES.length),
  lastReactedAt: isoDateSchema,
})

export const cardReactorsSchema = z.object({
  counts: reactionCountsSchema,
  reactors: z.array(cardReactorSchema),
})

export type CardReactor = z.infer<typeof cardReactorSchema>
export type CardReactors = z.infer<typeof cardReactorsSchema>
