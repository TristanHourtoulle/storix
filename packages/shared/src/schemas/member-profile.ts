import { z } from 'zod'
import { EMBLEM_IDS, FEATURED_EMBLEMS_MAX, SHOWCASE_SLOTS } from '../domain'
import { cardTierSchema, collectionCardSchema } from './cards'
import { idSchema, isoDateSchema } from './common'
import { emblemIdSchema } from './emblems'
import { cosmeticItemIdSchema } from './cosmetics'
import { portraitSchema } from './portraits'

export const memberProfileSchema = z.object({
  header: z.object({
    userId: idSchema,
    displayUsername: z.string(),
    avatar: portraitSchema.nullable(),
    avatarFrame: cosmeticItemIdSchema.nullable(),
    joinedAt: isoDateSchema,
    isSelf: z.boolean(),
    featuredEmblems: z.array(emblemIdSchema).max(FEATURED_EMBLEMS_MAX),
  }),
  stats: z.object({
    photosPosted: z.int().min(0),
    cardsOwned: z.int().min(0),
    discoveries: z.int().min(0),
    bestTier: cardTierSchema.nullable(),
    completionPercent: z.int().min(0).max(100).optional(),
  }),
  showcase: z.array(collectionCardSchema).max(SHOWCASE_SLOTS),
  isShowcaseCustom: z.boolean(),
  counts: z.object({
    photos: z.int().min(0),
    tagged: z.int().min(0),
    emblemsEarned: z.int().min(0).max(EMBLEM_IDS.length),
    emblemsTotal: z.literal(EMBLEM_IDS.length),
  }),
})

export type MemberProfile = z.infer<typeof memberProfileSchema>
