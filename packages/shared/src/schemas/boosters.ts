import { z } from 'zod'
import { charmIdSchema } from './charms'
import { cardAuthorSchema, cardMomentSchema, cardTierSchema, copyVariantSchema } from './cards'
import { isoDateSchema } from './common'
import { cardSealsSchema } from './series-refs'
import { imageSetSchema } from './media'
import { cardTitleSchema } from './uploads'
import { walletStateSchema } from './wallet'

export const openBoosterBodySchema = z.object({ requestId: z.uuid() })

export const boosterPullSchema = z.object({
  slot: z.int().min(0).max(4),
  card: z.object({
    id: z.uuid(),
    number: z.int().positive(),
    title: cardTitleSchema,
    tier: cardTierSchema,
    author: cardAuthorSchema,
    thumbhash: z.string(),
    dominantColor: z.string().regex(/^#[0-9a-f]{6}$/),
    width: z.int().positive(),
    height: z.int().positive(),
    image: imageSetSchema,
    capturedAt: isoDateSchema.nullable(),
    moment: cardMomentSchema.nullable(),
    seals: cardSealsSchema,
  }),
  variant: copyVariantSchema,
  outcome: z.enum(['new', 'upgraded', 'duplicate']),
  dust: z.int().min(0),
  stackCount: z.int().positive().nullable(),
  isFirstCopy: z.boolean(),
  isDiscovery: z.boolean(),
  isCharmBoosted: z.boolean().catch(false),
})

export const boosterOpeningSchema = z.object({
  id: z.uuid(),
  openedAt: isoDateSchema,
  pulls: z.array(boosterPullSchema).max(5),
  dustGained: z.int().min(0),
  isPremium: z.boolean(),
  charm: z
    .object({ id: charmIdSchema, chargesLeft: z.int().min(0) })
    .nullable()
    .catch(null),
  wallet: walletStateSchema,
})

export type OpenBoosterBody = z.infer<typeof openBoosterBodySchema>
export type BoosterPull = z.infer<typeof boosterPullSchema>
export type BoosterOpening = z.infer<typeof boosterOpeningSchema>
