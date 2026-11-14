import { z } from 'zod'
import { cardTierSchema } from './cards'
import { idSchema } from './common'

export const NEWS_ILLUSTRATIONS = [
  'camera',
  'stacks',
  'showcase',
  'share',
  'sort',
  'premium',
  'mythic',
  'upgrade',
  'journey',
  'history',
  'reactions',
  'members',
  'tagged',
  'emblems',
  'feed',
  'celebration',
  'missions',
  'goal',
] as const
export const newsIllustrationSchema = z.enum(NEWS_ILLUSTRATIONS)

export const NEWS_TRY_TARGETS = [
  'add',
  'home',
  'collection-discovery',
  'collection-upgradable',
  'collection-reactions',
  'booster-history',
  'members',
  'tagged',
  'emblems',
  'showcase-card',
  'stack-card',
  'shop',
  'style',
  'league',
  'none',
] as const
export const newsTryTargetSchema = z.enum(NEWS_TRY_TARGETS)

export const releaseIdSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}(-[a-z])?$/)

export const releaseNoteCardSchema = z.object({
  key: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  title: z.string().min(1).max(32),
  body: z.string().min(1).max(180),
  tier: cardTierSchema,
  illustration: newsIllustrationSchema,
  tryTarget: newsTryTargetSchema,
})

export const releaseNoteSchema = z.object({
  id: releaseIdSchema,
  publishedAt: z.iso.datetime({ offset: true }),
  cards: z.array(releaseNoteCardSchema).min(1).max(8),
})

export const whatsNewStateSchema = z.object({
  seenReleaseId: releaseIdSchema.nullable(),
  unseenReleaseIds: z.array(releaseIdSchema),
})

export const markWhatsNewSeenBodySchema = z.object({ releaseId: releaseIdSchema })

export const whatsNewTargetsSchema = z.object({
  showcaseCardId: idSchema.nullable(),
  stackCardId: idSchema.nullable(),
})

export type NewsIllustration = z.infer<typeof newsIllustrationSchema>
export type NewsTryTarget = z.infer<typeof newsTryTargetSchema>
export type ReleaseNoteCard = z.infer<typeof releaseNoteCardSchema>
export type ReleaseNote = z.infer<typeof releaseNoteSchema>
export type WhatsNewState = z.infer<typeof whatsNewStateSchema>
export type MarkWhatsNewSeenBody = z.infer<typeof markWhatsNewSeenBodySchema>
export type WhatsNewTargets = z.infer<typeof whatsNewTargetsSchema>
