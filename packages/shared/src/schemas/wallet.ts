import { z } from 'zod'
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
    nextEligibleAt: isoDateSchema.nullable(),
  }),
  pity: z.object({
    epicGuaranteeIn: z.int().min(1),
    epicProgress: z.number().min(0).max(1),
    legendaryBonusPercent: z.int().min(0),
    epicAvailable: z.boolean(),
    legendaryAvailable: z.boolean(),
  }),
})

export type WalletState = z.infer<typeof walletStateSchema>
