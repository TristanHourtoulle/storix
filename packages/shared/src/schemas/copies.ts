import { z } from 'zod'
import { copyVariantSchema } from './cards'

export const recycleBodySchema = z.object({ variant: copyVariantSchema })

export const dustBalanceSchema = z.object({ dust: z.int().min(0) })

export type RecycleBody = z.infer<typeof recycleBodySchema>
export type DustBalance = z.infer<typeof dustBalanceSchema>
