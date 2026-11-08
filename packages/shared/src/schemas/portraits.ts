import { z } from 'zod'

const MEDIA_URL_PREFIX = '/media/'

export const portraitSchema = z.object({
  url: z.string().startsWith(MEDIA_URL_PREFIX),
  thumbUrl: z.string().startsWith(MEDIA_URL_PREFIX),
  dominantColor: z.string().regex(/^#[0-9a-f]{6}$/),
})

export const completePortraitUploadBodySchema = z.strictObject({})

export const avatarUploadParamsSchema = z.object({ uploadId: z.uuid() })

export type Portrait = z.infer<typeof portraitSchema>
export type CompletePortraitUploadBody = z.infer<typeof completePortraitUploadBodySchema>
export type AvatarUploadParams = z.infer<typeof avatarUploadParamsSchema>
