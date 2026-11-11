import { z } from 'zod'
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
  nextFiresAt: isoDateSchema,
  post: momentPostViewSchema.nullable(),
})

/** The reservation is made when the back photo is taken, before either file size is known. */
export const createMomentUploadsBodySchema = z.object({})

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
