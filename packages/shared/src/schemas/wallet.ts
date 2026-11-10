import { z } from 'zod'
import { PREMIUM_BOOSTER_EVERY } from '../domain'
import { isoDateSchema } from './common'

export const walletStateSchema = z.object({
  dust: z.int().min(0),
  booster: z.object({
    stock: z.int().min(0),
    maxStock: z.int().min(1),
    nextAt: isoDateSchema.nullable(),
    intervalSeconds: z.int().min(60),
  }),
  pool: z.object({
    drawableCount: z.int().min(0),
    minimumCards: z.int().min(1),
    nextEligibleAt: isoDateSchema.nullable(),
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
})

export type WalletState = z.infer<typeof walletStateSchema>
