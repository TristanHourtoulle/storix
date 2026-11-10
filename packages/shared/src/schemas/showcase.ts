import { z } from 'zod'
import { SHOWCASE_SLOTS } from '../domain'

export const saveShowcaseBodySchema = z.object({
  cardIds: z
    .array(z.uuid())
    .max(SHOWCASE_SLOTS)
    .refine((ids) => new Set(ids).size === ids.length, { message: 'Duplicate card ids' }),
})

export type SaveShowcaseBody = z.infer<typeof saveShowcaseBodySchema>
