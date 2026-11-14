import { z } from 'zod'
import { PREMIUM_BOOSTER_EVERY } from '../domain'
import { activeCharmSchema } from './charms'
import { isoDateSchema } from './common'

export const walletStateSchema = z.object({
  dust: z.int().min(0),
  booster: z.object({
    stock: z.int().min(0),
    maxStock: z.int().min(1),
    nextAt: isoDateSchema.nullable(),
    intervalSeconds: z.int().min(60),
    joinGift: z.int().min(0),
    bonus: z.int().min(0),
    premiumGifts: z.int().min(0),
  }),
  pool: z.object({
    drawableCount: z.int().min(0),
    minimumCards: z.int().min(1),
    nextEligibleAt: isoDateSchema.nullable(),
    newCardDelayMinutes: z.int().min(0),
  }),
  pity: z.object({
    epicGuaranteeIn: z.int().min(1),
    epicProgress: z.number().min(0).max(1),
    legendaryBonusPercent: z.int().min(0),
    epicAvailable: z.boolean(),
    legendaryAvailable: z.boolean(),
  }),
  premium: z.object({
    boostersUntil: z.int().min(1).max(PREMIUM_BOOSTER_EVERY),
    progress: z.number().min(0).max(1),
  }),
  charm: activeCharmSchema,
})

export type WalletState = z.infer<typeof walletStateSchema>
