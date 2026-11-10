import { z } from 'zod'
import { EMBLEM_IDS, FEATURED_EMBLEMS_MAX } from '../domain'
import { isoDateSchema } from './common'

export const emblemIdSchema = z.enum(EMBLEM_IDS)

export const emblemProgressSchema = z.object({
  id: emblemIdSchema,
  progress: z.int().min(0),
  target: z.int().positive(),
  isEarned: z.boolean(),
  earnedAt: isoDateSchema.nullable(),
  featuredRank: z.int().min(1).max(FEATURED_EMBLEMS_MAX).nullable(),
})

export const memberEmblemsSchema = z.object({
  emblems: z.array(emblemProgressSchema).length(EMBLEM_IDS.length),
  featured: z.array(emblemIdSchema).max(FEATURED_EMBLEMS_MAX),
  earnedCount: z.int().min(0),
})

export const unseenEmblemSchema = z.object({ id: emblemIdSchema, earnedAt: isoDateSchema })

export const unseenEmblemsSchema = z.object({
  emblems: z.array(unseenEmblemSchema).max(EMBLEM_IDS.length),
})

const uniqueEmblemIds = (max: number) =>
  z
    .array(emblemIdSchema)
    .max(max)
    .refine((ids) => new Set(ids).size === ids.length, { message: 'Duplicate emblem ids' })

export const markEmblemsSeenBodySchema = z.object({
  emblemIds: uniqueEmblemIds(EMBLEM_IDS.length).refine((ids) => ids.length > 0, {
    message: 'At least one emblem id',
  }),
})

export const featuredEmblemsBodySchema = z.object({
  emblemIds: uniqueEmblemIds(FEATURED_EMBLEMS_MAX),
})

export type EmblemProgressView = z.infer<typeof emblemProgressSchema>
export type MemberEmblems = z.infer<typeof memberEmblemsSchema>
export type UnseenEmblem = z.infer<typeof unseenEmblemSchema>
export type UnseenEmblems = z.infer<typeof unseenEmblemsSchema>
export type MarkEmblemsSeenBody = z.infer<typeof markEmblemsSeenBodySchema>
export type FeaturedEmblemsBody = z.infer<typeof featuredEmblemsBodySchema>
