import { z } from 'zod'

export const MAX_SERIES_PER_UPLOAD = 4

export const cardSealSchema = z.object({
  seriesId: z.uuid(),
  title: z.string(),
  emoji: z.string(),
  color: z.string().regex(/^#[0-9a-f]{6}$/),
})

export const cardSealsSchema = z.array(cardSealSchema).catch([])

export const seriesIdsBodySchema = z
  .array(z.uuid())
  .max(MAX_SERIES_PER_UPLOAD)
  .refine((ids) => new Set(ids).size === ids.length)

export type CardSeal = z.infer<typeof cardSealSchema>
