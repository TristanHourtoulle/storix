import { z } from 'zod'
import {
  cardAuthorSchema,
  cardPersonSchema,
  cardTierSchema,
  collectionCardSchema,
  copyVariantSchema,
} from './cards'
import { isoDateSchema } from './common'
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
  }),
  variant: copyVariantSchema,
  outcome: z.enum(['new', 'upgraded', 'duplicate']),
  dust: z.int().min(0),
  stackCount: z.int().positive().nullable(),
  isFirstCopy: z.boolean(),
  isDiscovery: z.boolean(),
})

export const boosterOpeningSchema = z.object({
  id: z.uuid(),
  openedAt: isoDateSchema,
  pulls: z.array(boosterPullSchema).max(5),
  dustGained: z.int().min(0),
  isPremium: z.boolean(),
  wallet: walletStateSchema,
})

export const recentRevealSchema = z.object({
  pulledBy: cardPersonSchema,
  pulledAt: isoDateSchema,
  variant: copyVariantSchema,
  tierAtMint: cardTierSchema,
  card: collectionCardSchema,
})

export const recentRevealsSchema = z.array(recentRevealSchema).max(6)

export type OpenBoosterBody = z.infer<typeof openBoosterBodySchema>
export type BoosterPull = z.infer<typeof boosterPullSchema>
export type BoosterOpening = z.infer<typeof boosterOpeningSchema>
export type RecentReveal = z.infer<typeof recentRevealSchema>
