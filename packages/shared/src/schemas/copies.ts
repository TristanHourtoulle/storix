import { z } from 'zod'
import { cardTierSchema, copyVariantSchema } from './cards'

export const recycleBodySchema = z.object({ variant: copyVariantSchema })

export const dustBalanceSchema = z.object({ dust: z.int().min(0) })

export const promoteBodySchema = z.object({ from: cardTierSchema })

export const convertStackBodySchema = z.object({
  variant: copyVariantSchema,
  quantity: z.int().min(1).max(999),
  expectedCount: z.int().min(1).max(100_000),
})

export const stackActionResultSchema = z.object({
  dust: z.int().min(0),
  stackCount: z.int().min(0),
})

export type RecycleBody = z.infer<typeof recycleBodySchema>
export type DustBalance = z.infer<typeof dustBalanceSchema>
export type PromoteBody = z.infer<typeof promoteBodySchema>
export type ConvertStackBody = z.infer<typeof convertStackBodySchema>
export type StackActionResult = z.infer<typeof stackActionResultSchema>
