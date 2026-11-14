import { z } from 'zod'
import { CHARM_CHARGES, CHARM_IDS } from '../domain'

export const charmIdSchema = z.enum(CHARM_IDS)

/** A stored charm id read back from the server: an id this client does not know becomes null. */
export const storedCharmIdSchema = charmIdSchema.nullable().catch(null)

export const activeCharmSchema = z
  .object({ id: charmIdSchema, charges: z.int().min(1).max(CHARM_CHARGES) })
  .nullable()
  .catch(null)

export const charmShopResponseSchema = z.object({
  dust: z.int().min(0),
  active: activeCharmSchema,
  purchasesThisWeek: z.int().min(0),
  weeklyLimit: z.int().min(1),
  hasMythic: z.boolean(),
})

export const purchaseCharmBodySchema = z.object({
  charmId: charmIdSchema,
  replaceCharm: charmIdSchema.nullable(),
})

export const purchaseCharmResponseSchema = z.object({
  dust: z.int().min(0),
  active: activeCharmSchema,
  purchasesThisWeek: z.int().min(0),
})

export type ActiveCharmState = z.infer<typeof activeCharmSchema>
export type CharmShopResponse = z.infer<typeof charmShopResponseSchema>
export type PurchaseCharmBody = z.infer<typeof purchaseCharmBodySchema>
export type PurchaseCharmResponse = z.infer<typeof purchaseCharmResponseSchema>
