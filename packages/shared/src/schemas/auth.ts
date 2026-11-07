import { z } from 'zod'
import { idSchema } from './common'
import { leagueSummarySchema } from './leagues'

export const usernameSchema = z
  .string()
  .trim()
  .min(3)
  .max(24)
  .regex(/^[A-Za-z0-9_.]+$/)

export const passwordSchema = z.string().min(10).max(128)

export const sessionUserSchema = z.object({
  id: idSchema,
  username: z.string(),
  displayUsername: z.string(),
})

export const meResponseSchema = z.object({
  user: sessionUserSchema,
  leagues: z.array(leagueSummarySchema),
})

export type SessionUser = z.infer<typeof sessionUserSchema>
export type MeResponse = z.infer<typeof meResponseSchema>
