import { z } from 'zod'
import { REACTION_TYPES } from '../domain'
import { cardParamsSchema } from './cards'

export const reactionTypeSchema = z.enum(REACTION_TYPES)

export const reactionParamsSchema = cardParamsSchema.extend({ type: reactionTypeSchema })

export type ReactionParams = z.infer<typeof reactionParamsSchema>
