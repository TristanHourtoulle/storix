import { z } from 'zod'
import { DAILY_REROLLS, MISSION_PERIODS, MISSION_SOURCES } from '../domain'
import { isoDateSchema } from './common'

export const missionPeriodSchema = z.enum(MISSION_PERIODS)

export const missionRewardSchema = z.object({
  dust: z.int().min(0),
  boosters: z.int().min(0),
})

export const missionRowSchema = z.object({
  id: z.uuid(),
  missionId: z.string(),
  period: missionPeriodSchema,
  slot: z.int().min(0),
  source: z.enum(MISSION_SOURCES),
  label: z.string(),
  target: z.int().min(1),
  progress: z.int().min(0),
  reward: missionRewardSchema,
  isComplete: z.boolean(),
  isClaimed: z.boolean(),
  isAutoClaimed: z.boolean(),
  canReroll: z.boolean(),
})

export const missionPeriodStateSchema = z.object({
  key: z.string(),
  resetAt: isoDateSchema,
  rows: z.array(missionRowSchema),
  claimedCount: z.int().min(0),
})

export const missionsStateSchema = z.object({
  day: missionPeriodStateSchema.extend({
    rerollsLeft: z.int().min(0).max(DAILY_REROLLS),
  }),
  week: missionPeriodStateSchema,
})

export const missionParamsSchema = z.object({
  leagueId: z.uuid(),
  missionId: z.uuid(),
})

export const missionClaimSchema = z.object({
  mission: missionRowSchema,
  reward: missionRewardSchema,
  dust: z.int().min(0),
  weekCompleted: z.boolean(),
})

export const missionRerollSchema = z.object({ mission: missionRowSchema })

export type MissionRow = z.infer<typeof missionRowSchema>
export type MissionPeriodState = z.infer<typeof missionPeriodStateSchema>
export type MissionsState = z.infer<typeof missionsStateSchema>
export type MissionClaim = z.infer<typeof missionClaimSchema>
export type MissionReroll = z.infer<typeof missionRerollSchema>
