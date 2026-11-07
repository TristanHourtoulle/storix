import { z } from 'zod'
import { idSchema } from './common'
import { leagueSummarySchema } from './leagues'

export const usernameSchema = z
  .string()
  .trim()
  .min(3)
  .max(24)
  .regex(/^[A-Za-z0-9_.]+$/)

export const DISPLAY_NAME_MIN_LENGTH = 2
export const DISPLAY_NAME_MAX_LENGTH = 24

export const displayNameSchema = z
  .string()
  .trim()
  .normalize('NFC')
  .min(DISPLAY_NAME_MIN_LENGTH)
  .max(DISPLAY_NAME_MAX_LENGTH)
  .regex(/^[\p{L}0-9._-](?:[\p{L}0-9 ._-]*[\p{L}0-9._-])?$/u)

export const updateDisplayNameBodySchema = z.object({ displayName: displayNameSchema })

export const passwordSchema = z.string().min(10).max(128)

export const sessionUserSchema = z.object({
  id: idSchema,
  username: z.string(),
  displayUsername: z.string(),
})

export const meResponseSchema = z.object({
  user: sessionUserSchema,
  homeLeagueId: idSchema.nullable(),
  leagues: z.array(leagueSummarySchema),
})

export type MeResponse = z.infer<typeof meResponseSchema>
export type UpdateDisplayNameBody = z.infer<typeof updateDisplayNameBodySchema>
