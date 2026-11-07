import { z } from 'zod'
import { MEDIA_FORMATS, MEDIA_OBJECT_KEY_PATTERN } from '../domain'

export const mediaVariantSchema = z.object({
  size: z.union([z.literal(256), z.literal(768), z.literal(1600)]),
  format: z.enum(MEDIA_FORMATS),
  key: z.string().regex(MEDIA_OBJECT_KEY_PATTERN),
  width: z.int().positive(),
  height: z.int().positive(),
  bytes: z.int().positive(),
})

export const mediaVariantsSchema = z.array(mediaVariantSchema).length(6)

export const imageSourceSchema = z.object({
  url: z.string().startsWith('/media/'),
  width: z.int().positive(),
})

export const imageSetSchema = z.object({
  avif: z.array(imageSourceSchema).min(1),
  webp: z.array(imageSourceSchema).min(1),
})

export type MediaVariant = z.infer<typeof mediaVariantSchema>
export type ImageSource = z.infer<typeof imageSourceSchema>
export type ImageSet = z.infer<typeof imageSetSchema>
