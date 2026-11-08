import { z } from 'zod'
import {
  CARD_TITLE_MAX_LENGTH,
  type CropRect,
  type DraftUploadStatus,
  MAX_PUBLISH_BATCH,
  type PublishProblemReason,
  UPLOAD_CONTENT_TYPE,
  UPLOAD_MAX_BYTES,
  UPLOAD_MIN_BYTES,
} from '../domain'
import { idSchema, isoDateSchema } from './common'
import { imageSetSchema } from './media'

export const UPLOAD_STATUSES = [
  'pending',
  'uploaded',
  'processing',
  'ready',
  'rejected',
  'failed',
  'staged',
  'publishing',
  'discarded',
] as const satisfies readonly DraftUploadStatus[]
export const UPLOAD_REJECTION_REASONS = ['DUPLICATE_PHOTO', 'INVALID_IMAGE', 'NOT_ALLOWED'] as const
export const UPLOAD_KINDS = ['card', 'avatar', 'league'] as const

export type UploadStatus = (typeof UPLOAD_STATUSES)[number]
export type UploadRejectionReason = (typeof UPLOAD_REJECTION_REASONS)[number]
export type UploadKind = (typeof UPLOAD_KINDS)[number]

type IsSame<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false
type AssertTrue<T extends true> = T
/** Compile-time proof that the domain status union lists exactly `UPLOAD_STATUSES`. */
export type UploadStatusesMatchDomain = AssertTrue<IsSame<UploadStatus, DraftUploadStatus>>

export const MAX_TAGGED_USERS = 30
const MAX_DISCARD_BATCH = 60
const MAX_STATES_BATCH = 30
const CROP_BOUNDS_EPSILON = 1e-6

function isUnique(values: readonly string[]): boolean {
  return new Set(values).size === values.length
}

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

export const taggedUserIdsBodySchema = z.array(idSchema).max(MAX_TAGGED_USERS).refine(isUnique)

export const completeUploadBodySchema = z.object({
  title: cardTitleSchema.optional(),
  taggedUserIds: taggedUserIdsBodySchema.optional(),
  capturedAt: isoDateSchema.nullable(),
})

export const cropRectSchema = z
  .object({
    x: z.number().min(0).max(1),
    y: z.number().min(0).max(1),
    w: z.number().gt(0).max(1),
    h: z.number().gt(0).max(1),
    rotate: z.union([z.literal(0), z.literal(90), z.literal(180), z.literal(270)]),
  })
  .refine((c) => c.x + c.w <= 1 + CROP_BOUNDS_EPSILON && c.y + c.h <= 1 + CROP_BOUNDS_EPSILON)

export const draftTitleSchema = z.string().trim().max(CARD_TITLE_MAX_LENGTH)

export const editUploadBodySchema = z
  .object({
    title: draftTitleSchema.optional(),
    taggedUserIds: taggedUserIdsBodySchema.optional(),
    crop: cropRectSchema.nullable().optional(),
  })
  .refine((b) => Object.keys(b).length > 0)

export const uploadIdsBodySchema = z.object({
  uploadIds: z.array(z.uuid()).min(1).max(MAX_PUBLISH_BATCH).refine(isUnique),
})

export const discardUploadsBodySchema = z.object({
  uploadIds: z.array(z.uuid()).min(1).max(MAX_DISCARD_BATCH).refine(isUnique),
})

export const uploadStateSchema = z.object({
  uploadId: z.uuid(),
  status: z.enum(UPLOAD_STATUSES),
  cardId: z.uuid().nullable(),
  rejectionReason: z.enum(UPLOAD_REJECTION_REASONS).nullable(),
})

export const uploadStatesQuerySchema = z.object({
  ids: z
    .string()
    .transform((ids) => ids.split(','))
    .pipe(z.array(z.uuid()).min(1).max(MAX_STATES_BATCH)),
})

export const uploadStatesResponseSchema = z.object({ states: z.array(uploadStateSchema) })

export const publishProblemSchema = z.object({
  uploadId: z.uuid(),
  reason: z.enum(['NOT_FOUND', 'NOT_STAGED', 'NOT_PUBLISHABLE', 'TITLE_REQUIRED', 'CROP_INVALID']),
})

export const uploadDraftSchema = z.object({
  uploadId: z.uuid(),
  status: z.enum(['uploaded', 'processing', 'staged']),
  title: z.string().nullable(),
  taggedUserIds: z.array(idSchema),
  crop: cropRectSchema.nullable(),
  capturedAt: isoDateSchema.nullable(),
  createdAt: isoDateSchema,
  expiresAt: isoDateSchema,
  media: z
    .object({
      image: imageSetSchema,
      thumbhash: z.string(),
      width: z.int().positive(),
      height: z.int().positive(),
    })
    .nullable(),
})

export const uploadDraftsResponseSchema = z.object({ drafts: z.array(uploadDraftSchema) })

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
export type CropRectBody = z.infer<typeof cropRectSchema>
export type EditUploadBody = z.infer<typeof editUploadBodySchema>
export type UploadIdsBody = z.infer<typeof uploadIdsBodySchema>
export type DiscardUploadsBody = z.infer<typeof discardUploadsBodySchema>
export type UploadStatesResponse = z.infer<typeof uploadStatesResponseSchema>
export type UploadDraft = z.infer<typeof uploadDraftSchema>
export type UploadDraftsResponse = z.infer<typeof uploadDraftsResponseSchema>
export type PublishProblem = z.infer<typeof publishProblemSchema>

/** Compile-time proof that the crop body is exactly the domain `CropRect`. */
export type CropRectBodyMatchesDomain = AssertTrue<IsSame<CropRectBody, CropRect>>
/** Compile-time proof that the publish problem reasons match the domain union. */
export type PublishProblemMatchesDomain = AssertTrue<
  IsSame<PublishProblem['reason'], PublishProblemReason>
>
