import { z } from 'zod'
import { UPLOAD_CONTENT_TYPE, UPLOAD_MAX_BYTES, UPLOAD_MIN_BYTES } from '../domain'
import { isoDateSchema } from './common'
import { createUploadResponseSchema } from './uploads'

export const momentPostViewSchema = z.object({
  takenAt: isoDateSchema,
  lateMinutes: z.int().min(0),
  rewardDust: z.int().min(0),
})

export const currentMomentSchema = z.object({
  day: z.iso.date(),
  firesAt: isoDateSchema,
  windowEndsAt: isoDateSchema,
  post: momentPostViewSchema.nullable(),
})

const momentFileSchema = z.object({
  contentType: z.literal(UPLOAD_CONTENT_TYPE),
  size: z.int().min(UPLOAD_MIN_BYTES).max(UPLOAD_MAX_BYTES),
})

export const createMomentUploadsBodySchema = z.object({
  back: momentFileSchema,
  selfie: momentFileSchema,
})

export const createMomentUploadsResponseSchema = z.object({
  back: createUploadResponseSchema,
  selfie: createUploadResponseSchema,
})

export const postMomentBodySchema = z
  .object({
    backUploadId: z.uuid(),
    selfieUploadId: z.uuid(),
    capturedAt: isoDateSchema.nullable(),
  })
  .refine((body) => body.backUploadId !== body.selfieUploadId)

export const postMomentResponseSchema = momentPostViewSchema.extend({ day: z.iso.date() })

export type CurrentMoment = z.infer<typeof currentMomentSchema>
export type MomentPostView = z.infer<typeof momentPostViewSchema>
export type CreateMomentUploadsBody = z.infer<typeof createMomentUploadsBodySchema>
export type CreateMomentUploadsResponse = z.infer<typeof createMomentUploadsResponseSchema>
export type PostMomentBody = z.infer<typeof postMomentBodySchema>
export type PostMomentResponse = z.infer<typeof postMomentResponseSchema>
