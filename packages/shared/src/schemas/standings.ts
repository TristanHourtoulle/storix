import { z } from 'zod'
import type { StandingStats } from '../domain/standings'
import { idSchema, isoDateSchema } from './common'
import { storedCosmeticItemIdSchema } from './cosmetics'
import { portraitSchema } from './portraits'

const countSchema = z.int().min(0)

export const memberStatsSchema = z.object({
  uniqueCards: countSchema,
  copies: countSchema,
  rarityScore: countSchema,
  mythics: countSchema,
  legendaries: countSchema,
  foils: countSchema,
  bestFoilTier: z.int().min(0).max(6),
  weekCards: countSchema,
  photos: countSchema,
  reactionsReceived: countSchema,
  muse: countSchema,
  boostersOpened: countSchema,
  dust: countSchema,
  promotions: countSchema,
  recycled: countSchema,
  discoveries: countSchema,
  mythicPulls: countSchema,
  onTimeMoments: countSchema,
  missions: countSchema,
  shopSpent: countSchema,
}) satisfies z.ZodType<StandingStats>

export const standingsMemberSchema = z.object({
  userId: idSchema,
  displayUsername: z.string(),
  avatar: portraitSchema.nullable(),
  avatarFrame: storedCosmeticItemIdSchema,
  nameStyle: storedCosmeticItemIdSchema,
  isSelf: z.boolean(),
  joinedAt: isoDateSchema,
  stats: memberStatsSchema,
})

export const leagueStandingsSchema = z.object({
  leagueCardCount: countSchema,
  members: z.array(standingsMemberSchema),
})

export type MemberStats = z.infer<typeof memberStatsSchema>
export type StandingsMember = z.infer<typeof standingsMemberSchema>
export type LeagueStandings = z.infer<typeof leagueStandingsSchema>
