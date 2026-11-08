import { z } from 'zod'
import {
  CARD_TITLE_MAX_LENGTH,
  UPLOAD_CONTENT_TYPE,
  UPLOAD_MAX_BYTES,
  UPLOAD_MIN_BYTES,
} from '../domain'
import { idSchema, isoDateSchema } from './common'

export const UPLOAD_STATUSES = [
  'pending',
  'uploaded',
  'processing',
  'ready',
  'rejected',
  'failed',
] as const
export const UPLOAD_REJECTION_REASONS = ['DUPLICATE_PHOTO', 'INVALID_IMAGE'] as const

export type UploadStatus = (typeof UPLOAD_STATUSES)[number]
export type UploadRejectionReason = (typeof UPLOAD_REJECTION_REASONS)[number]

export const createUploadBodySchema = z.object({
  contentType: z.literal(UPLOAD_CONTENT_TYPE),
  size: z.int().min(UPLOAD_MIN_BYTES).max(UPLOAD_MAX_BYTES),
})

export const createUploadResponseSchema = z.object({
  uploadId: z.uuid(),
  url: z.url(),
  fields: z.record(z.string(), z.string()),
  expiresAt: isoDateSchema,
})

export const cardTitleSchema = z.string().trim().min(1).max(CARD_TITLE_MAX_LENGTH)

export const taggedUserIdsSchema = z.array(idSchema)

export const completeUploadBodySchema = z.object({
  title: cardTitleSchema,
  taggedUserIds: z
    .array(idSchema)
    .max(30)
    .refine((ids) => new Set(ids).size === ids.length),
  capturedAt: isoDateSchema.nullable(),
})

export const uploadStateSchema = z.object({
  uploadId: z.uuid(),
  status: z.enum(UPLOAD_STATUSES),
  cardId: z.uuid().nullable(),
  rejectionReason: z.enum(UPLOAD_REJECTION_REASONS).nullable(),
})

export const uploadQuotaSchema = z.discriminatedUnion('unlimited', [
  z.object({
    unlimited: z.literal(false),
    limit: z.int().min(0),
    used: z.int().min(0),
    remaining: z.int().min(0),
  }),
  z.object({
    unlimited: z.literal(true),
    limit: z.null(),
    used: z.int().min(0),
    remaining: z.null(),
  }),
])

export const uploadParamsSchema = z.object({ leagueId: z.uuid(), uploadId: z.uuid() })

export type CreateUploadBody = z.infer<typeof createUploadBodySchema>
export type CreateUploadResponse = z.infer<typeof createUploadResponseSchema>
export type CompleteUploadBody = z.infer<typeof completeUploadBodySchema>
export type UploadState = z.infer<typeof uploadStateSchema>
export type UploadQuota = z.infer<typeof uploadQuotaSchema>
