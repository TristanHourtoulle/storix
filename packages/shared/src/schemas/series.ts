import { z } from 'zod'
import {
  EVENT_ICONS,
  SERIES_ICONS,
  SERIES_KINDS,
  SERIES_PHASES,
  SERIES_TITLE_MAX_LENGTH,
} from '../domain'
import { isoDateSchema } from './common'
import { goalContributorSchema } from './league-goal'
import { seriesIconSchema } from './series-refs'

export const SERIES_THEME_CONTRIBUTORS = 4

const colorSchema = z.string().regex(/^#[0-9a-f]{6}$/)

export const seriesKindSchema = z.enum(SERIES_KINDS)
export const seriesPhaseSchema = z.enum(SERIES_PHASES)

export const seriesSummarySchema = z.object({
  id: z.uuid(),
  kind: seriesKindSchema,
  title: z.string(),
  icon: seriesIconSchema,
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
  icon: seriesIconSchema,
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
  icon: z.enum(SERIES_ICONS),
})

export const addSeriesCardBodySchema = z.object({ cardId: z.uuid() })

export const seriesParamsSchema = z.object({ leagueId: z.uuid(), seriesId: z.uuid() })

export const eventBodySchema = z.object({
  title: z.string().trim().min(1).max(SERIES_TITLE_MAX_LENGTH),
  icon: z.enum(EVENT_ICONS),
  startsAt: isoDateSchema,
  endsAt: isoDateSchema,
})

export const eventPatchSchema = eventBodySchema
  .partial()
  .refine((patch) => Object.keys(patch).length > 0)

export const eventCreatorSchema = z.object({
  userId: z.string(),
  displayUsername: z.string(),
})

export const eventSummarySchema = seriesSummarySchema.extend({
  createdBy: eventCreatorSchema.nullable(),
  canManage: z.boolean(),
  memberCount: z.int().min(0),
})

export const eventListSchema = z.object({
  live: z.array(eventSummarySchema),
  grace: z.array(eventSummarySchema),
  upcoming: z.array(eventSummarySchema),
})

export type SeriesSummary = z.infer<typeof seriesSummarySchema>
export type SeriesShelf = z.infer<typeof seriesShelfSchema>
export type ThemeCard = z.infer<typeof themeCardSchema>
export type SeriesDetail = z.infer<typeof seriesDetailSchema>
export type NextTheme = z.infer<typeof nextThemeSchema>
export type ThemeOverrideBody = z.infer<typeof themeOverrideBodySchema>
export type AddSeriesCardBody = z.infer<typeof addSeriesCardBodySchema>
export type EventBody = z.infer<typeof eventBodySchema>
export type EventPatch = z.infer<typeof eventPatchSchema>
export type EventSummary = z.infer<typeof eventSummarySchema>
export type EventList = z.infer<typeof eventListSchema>
