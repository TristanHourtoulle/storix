import { z } from 'zod'
import { PORTRAIT_OBJECT_KEY_PATTERN, parseMediaPath } from '../domain'

function isSignedPortraitPath(url: string): boolean {
  const objectKey = parseMediaPath(url)?.objectKey
  return objectKey !== undefined && PORTRAIT_OBJECT_KEY_PATTERN.test(objectKey)
}

const portraitUrlSchema = z
  .string()
  .refine(isSignedPortraitPath, { message: 'Expected a signed portrait media path' })

export const portraitSchema = z.object({
  url: portraitUrlSchema,
  thumbUrl: portraitUrlSchema,
  dominantColor: z.string().regex(/^#[0-9a-f]{6}$/),
})

export const completePortraitUploadBodySchema = z.strictObject({})

export const avatarUploadParamsSchema = z.object({ uploadId: z.uuid() })

export type Portrait = z.infer<typeof portraitSchema>
export type CompletePortraitUploadBody = z.infer<typeof completePortraitUploadBodySchema>
export type AvatarUploadParams = z.infer<typeof avatarUploadParamsSchema>
