import { z } from 'zod'
import { isoDateSchema } from './common'
import { passwordSchema, usernameSchema } from './auth'

export const issueResetCodeResponseSchema = z.object({
  code: z.string(),
  expiresAt: isoDateSchema,
})

export const redeemResetCodeBodySchema = z.object({
  username: usernameSchema,
  code: z.string().min(1).max(32),
  newPassword: passwordSchema,
})

export type IssueResetCodeResponse = z.infer<typeof issueResetCodeResponseSchema>
export type RedeemResetCodeBody = z.infer<typeof redeemResetCodeBodySchema>
