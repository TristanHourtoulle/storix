import { z } from 'zod'
import { COSMETIC_ITEM_IDS, COSMETIC_SLOTS, findCosmetic } from '../domain'
import { collectionCardSchema } from './cards'

export const cosmeticItemIdSchema = z.enum(COSMETIC_ITEM_IDS)
export const cosmeticSlotSchema = z.enum(COSMETIC_SLOTS)

export const equippedCosmeticsSchema = z.object({
  booster: cosmeticItemIdSchema.nullable(),
  cardBack: cosmeticItemIdSchema.nullable(),
  raritySet: cosmeticItemIdSchema.nullable(),
  avatarFrame: cosmeticItemIdSchema.nullable(),
  revealAura: cosmeticItemIdSchema.nullable(),
})

export const myCosmeticsResponseSchema = z.object({
  owned: z.array(cosmeticItemIdSchema),
  equipped: equippedCosmeticsSchema,
})

export const equipCosmeticBodySchema = z
  .object({ slot: cosmeticSlotSchema, itemId: cosmeticItemIdSchema.nullable() })
  .refine((body) => body.itemId === null || findCosmetic(body.itemId)?.slot === body.slot, {
    message: 'Item does not belong to this slot',
    path: ['itemId'],
  })

export const purchaseCosmeticBodySchema = z.object({
  itemId: cosmeticItemIdSchema,
  equip: z.boolean(),
})

export const purchaseCosmeticResponseSchema = z.object({
  dust: z.int().min(0),
  owned: z.array(cosmeticItemIdSchema),
  equipped: equippedCosmeticsSchema,
})

export const tryOnCardsResponseSchema = z.object({ cards: z.array(collectionCardSchema) })

export type EquippedCosmetics = z.infer<typeof equippedCosmeticsSchema>
export type MyCosmeticsResponse = z.infer<typeof myCosmeticsResponseSchema>
export type EquipCosmeticBody = z.infer<typeof equipCosmeticBodySchema>
export type PurchaseCosmeticBody = z.infer<typeof purchaseCosmeticBodySchema>
export type PurchaseCosmeticResponse = z.infer<typeof purchaseCosmeticResponseSchema>
export type TryOnCardsResponse = z.infer<typeof tryOnCardsResponseSchema>
