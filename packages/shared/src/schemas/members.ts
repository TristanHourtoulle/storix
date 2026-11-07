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
  authoredCardCount: z.int().min(0),
  canTransferOwnership: z.boolean(),
})

export const updateMemberRoleBodySchema = z.object({ role: z.enum(['admin', 'member']) })

export const transferOwnershipBodySchema = z.object({ userId: idSchema })

export const photosChoiceSchema = z.enum(['keep', 'delete'])

export const leaveLeagueBodySchema = z.object({ photos: photosChoiceSchema })

export const removeMemberBodySchema = z.object({ photos: photosChoiceSchema })

export const memberParamsSchema = z.object({ leagueId: z.uuid(), userId: idSchema })

export type MemberSummary = z.infer<typeof memberSummarySchema>
export type UpdateMemberRoleBody = z.infer<typeof updateMemberRoleBodySchema>
export type PhotosChoice = z.infer<typeof photosChoiceSchema>
export type LeaveLeagueBody = z.infer<typeof leaveLeagueBodySchema>
export type RemoveMemberBody = z.infer<typeof removeMemberBodySchema>
export type TransferOwnershipBody = z.infer<typeof transferOwnershipBodySchema>
