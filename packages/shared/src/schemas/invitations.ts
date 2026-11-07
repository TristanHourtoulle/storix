import { z } from 'zod'
import { INVITATION_EXPIRY_DAYS, INVITATION_MAX_USES_LIMIT, type InvitationStatus } from '../domain'
import { idSchema, isoDateSchema } from './common'
import { passwordSchema, usernameSchema } from './auth'

const INVITATION_STATUSES = [
  'valid',
  'revoked',
  'expired',
  'exhausted',
] as const satisfies readonly InvitationStatus[]

export const invitationStatusSchema = z.enum(INVITATION_STATUSES)

export const invitationTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/)

export const createInvitationBodySchema = z.object({
  expiresInDays: z.union(INVITATION_EXPIRY_DAYS.map((days) => z.literal(days))),
  maxUses: z.int().min(1).max(INVITATION_MAX_USES_LIMIT),
})

export const invitationSummarySchema = z.object({
  id: idSchema,
  createdBy: z.string().nullable(),
  expiresAt: isoDateSchema,
  maxUses: z.int(),
  uses: z.int(),
  status: invitationStatusSchema,
})

export const createInvitationResponseSchema = z.object({
  invitation: invitationSummarySchema,
  url: z.string(),
})

export const invitationPreviewSchema = z.object({
  status: invitationStatusSchema,
  league: z.object({ name: z.string(), memberCount: z.int().min(0) }).nullable(),
  invitedBy: z.string().nullable(),
  isMember: z.boolean(),
})

export const signupBodySchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
})

export const joinResponseSchema = z.object({ leagueId: idSchema })

export type CreateInvitationBody = z.infer<typeof createInvitationBodySchema>
export type InvitationSummary = z.infer<typeof invitationSummarySchema>
export type CreateInvitationResponse = z.infer<typeof createInvitationResponseSchema>
export type InvitationPreview = z.infer<typeof invitationPreviewSchema>
export type SignupBody = z.infer<typeof signupBodySchema>
export type JoinResponse = z.infer<typeof joinResponseSchema>
