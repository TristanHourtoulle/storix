import { z } from 'zod'
import { DEFAULT_SERIES_ICON, SERIES_ICONS } from '../domain'

export const MAX_SERIES_PER_UPLOAD = 4

export const seriesIconSchema = z.enum(SERIES_ICONS).catch(DEFAULT_SERIES_ICON)

export const cardSealSchema = z.object({
  seriesId: z.uuid(),
  title: z.string(),
  icon: seriesIconSchema,
  color: z.string().regex(/^#[0-9a-f]{6}$/),
})

export const cardSealsSchema = z.array(cardSealSchema).catch([])

export const seriesIdsBodySchema = z
  .array(z.uuid())
  .max(MAX_SERIES_PER_UPLOAD)
  .refine((ids) => new Set(ids).size === ids.length)

export const storedSeriesIdsSchema = z.array(z.uuid()).catch([])

export type CardSeal = z.infer<typeof cardSealSchema>
