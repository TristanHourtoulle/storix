import { z } from 'zod'
import { GOAL_CONTRIBUTOR_AVATARS, GOAL_STATUSES, GOAL_TYPES } from '../domain'
import { idSchema, isoDateSchema } from './common'
import { storedCosmeticItemIdSchema } from './cosmetics'
import { portraitSchema } from './portraits'

export const goalTypeSchema = z.enum(GOAL_TYPES)
export const goalStatusSchema = z.enum(GOAL_STATUSES)

export const goalContributorSchema = z.object({
  userId: idSchema,
  displayUsername: z.string(),
  avatar: portraitSchema.nullable(),
  avatarFrame: storedCosmeticItemIdSchema,
  count: z.int().min(1),
})

export const leagueGoalSchema = z.object({
  weekKey: z.string(),
  type: goalTypeSchema,
  target: z.int().min(1),
  bonusTarget: z.int().min(1),
  progress: z.int().min(0),
  status: goalStatusSchema,
  endsAt: isoDateSchema,
  own: z.int().min(0),
  contributorsCount: z.int().min(0),
  contributors: z.array(goalContributorSchema).max(GOAL_CONTRIBUTOR_AVATARS),
  showBanner: z.boolean(),
})

export const goalContributorsSchema = z.object({
  type: goalTypeSchema,
  contributors: z.array(goalContributorSchema),
})

export type GoalContributor = z.infer<typeof goalContributorSchema>
export type LeagueGoal = z.infer<typeof leagueGoalSchema>
export type GoalContributors = z.infer<typeof goalContributorsSchema>
