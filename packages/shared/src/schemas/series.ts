import { z } from 'zod'
import {
  isSingleEmoji,
  SERIES_EMOJI_MAX_LENGTH,
  SERIES_KINDS,
  SERIES_PHASES,
  SERIES_TITLE_MAX_LENGTH,
} from '../domain'
import { isoDateSchema } from './common'
import { goalContributorSchema } from './league-goal'

export const SERIES_THEME_CONTRIBUTORS = 4

const colorSchema = z.string().regex(/^#[0-9a-f]{6}$/)

export const seriesKindSchema = z.enum(SERIES_KINDS)
export const seriesPhaseSchema = z.enum(SERIES_PHASES)

export const seriesSummarySchema = z.object({
  id: z.uuid(),
  kind: seriesKindSchema,
  title: z.string(),
  emoji: z.string(),
  color: colorSchema,
  phase: seriesPhaseSchema,
  startsAt: isoDateSchema,
  endsAt: isoDateSchema,
  graceEndsAt: isoDateSchema,
  cardCount: z.int().min(0),
  ownedCount: z.int().min(0),
})

export const seriesShelfSchema = z.object({ series: z.array(seriesSummarySchema) })

export const themeIdeaSchema = z.object({
  title: z.string(),
  emoji: z.string(),
  color: colorSchema,
})

export const nextThemeSchema = themeIdeaSchema.extend({
  weekKey: z.string(),
  isOverride: z.boolean(),
})

export const themeCardSchema = z.object({
  series: seriesSummarySchema,
  daysLeft: z.int().min(0),
  memberCount: z.int().min(0),
  contributors: z.array(goalContributorSchema).max(SERIES_THEME_CONTRIBUTORS),
})

export const seriesDetailSchema = z.object({
  series: seriesSummarySchema,
  memberCount: z.int().min(0),
  isRewardEligible: z.boolean(),
  isRewarded: z.boolean(),
  nextTheme: nextThemeSchema.nullable(),
  canOverrideNextTheme: z.boolean(),
})

export const themeOverrideBodySchema = z.object({
  title: z.string().trim().min(1).max(SERIES_TITLE_MAX_LENGTH),
  emoji: z.string().trim().min(1).max(SERIES_EMOJI_MAX_LENGTH).refine(isSingleEmoji),
})

export const addSeriesCardBodySchema = z.object({ cardId: z.uuid() })

export const seriesParamsSchema = z.object({ leagueId: z.uuid(), seriesId: z.uuid() })

export type SeriesSummary = z.infer<typeof seriesSummarySchema>
export type SeriesShelf = z.infer<typeof seriesShelfSchema>
export type ThemeCard = z.infer<typeof themeCardSchema>
export type SeriesDetail = z.infer<typeof seriesDetailSchema>
export type NextTheme = z.infer<typeof nextThemeSchema>
export type ThemeOverrideBody = z.infer<typeof themeOverrideBodySchema>
export type AddSeriesCardBody = z.infer<typeof addSeriesCardBodySchema>
