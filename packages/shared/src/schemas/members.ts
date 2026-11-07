import { z } from 'zod'
import { idSchema, isoDateSchema, leagueRoleSchema } from './common'

export const memberSummarySchema = z.object({
  userId: idSchema,
  displayUsername: z.string(),
  role: leagueRoleSchema,
  joinedAt: isoDateSchema,
  isSelf: z.boolean(),
  canChangeRole: z.boolean(),
  canRemove: z.boolean(),
  canIssueResetCode: z.boolean(),
})

export const updateMemberRoleBodySchema = z.object({ role: z.enum(['admin', 'member']) })

export const memberParamsSchema = z.object({ leagueId: z.uuid(), userId: idSchema })

export type MemberSummary = z.infer<typeof memberSummarySchema>
export type UpdateMemberRoleBody = z.infer<typeof updateMemberRoleBodySchema>
