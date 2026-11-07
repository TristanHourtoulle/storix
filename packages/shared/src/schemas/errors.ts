import { z } from 'zod'

export const ERROR_CODES = [
  'VALIDATION_FAILED',
  'UNAUTHENTICATED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CSRF_ORIGIN_MISMATCH',
  'RATE_LIMITED',
  'USERNAME_TAKEN',
  'INVITATION_INVALID',
  'ALREADY_MEMBER',
  'RESET_NOT_ALLOWED',
  'INVALID_RESET_CODE',
  'UPLOAD_QUOTA_EXCEEDED',
  'UPLOAD_NOT_READY',
  'INTERNAL_ERROR',
] as const

export type ErrorCode = (typeof ERROR_CODES)[number]

export const apiErrorSchema = z.object({
  error: z.object({
    code: z.enum(ERROR_CODES),
    message: z.string(),
    details: z.record(z.string(), z.unknown()).optional(),
  }),
})

export type ApiError = z.infer<typeof apiErrorSchema>
