import { z } from 'zod'
import { idSchema, leagueRoleSchema } from './common'

export const leagueNameSchema = z.string().trim().min(2).max(40)

export const createLeagueBodySchema = z.object({ name: leagueNameSchema })

export const renameLeagueBodySchema = z.object({ name: leagueNameSchema })

export const leagueSummarySchema = z.object({
  id: idSchema,
  name: z.string(),
  role: leagueRoleSchema,
  memberCount: z.int().min(0),
})

export const leagueDetailSchema = z.object({
  id: idSchema,
  name: z.string(),
  memberCount: z.int().min(0),
  myRole: leagueRoleSchema,
  permissions: z.object({
    canManageInvitations: z.boolean(),
    canManageMembers: z.boolean(),
  }),
})

export const leagueParamsSchema = z.object({ leagueId: z.uuid() })

export type CreateLeagueBody = z.infer<typeof createLeagueBodySchema>
export type RenameLeagueBody = z.infer<typeof renameLeagueBodySchema>
export type LeagueSummary = z.infer<typeof leagueSummarySchema>
export type LeagueDetail = z.infer<typeof leagueDetailSchema>
