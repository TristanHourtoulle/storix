import { z } from 'zod'
import { COSMETIC_ITEM_IDS, COSMETIC_SLOTS, findCosmetic } from '../domain'
import { collectionCardSchema } from './cards'

export const cosmeticItemIdSchema = z.enum(COSMETIC_ITEM_IDS)
export const cosmeticSlotSchema = z.enum(COSMETIC_SLOTS)

/** A stored item id read back from the server: an id this client does not know becomes null. */
export const storedCosmeticItemIdSchema = cosmeticItemIdSchema.nullable().catch(null)

/** Owned item ids read back from the server, dropping ids this client does not know. */
export const ownedCosmeticItemIdsSchema = z.codec(
  z.array(z.string()),
  z.array(cosmeticItemIdSchema),
  {
    decode: (ids) =>
      ids.flatMap((id) => {
        const parsed = cosmeticItemIdSchema.safeParse(id)
        return parsed.success ? [parsed.data] : []
      }),
    encode: (ids) => ids,
  },
)

export const equippedCosmeticsSchema = z.object({
  booster: storedCosmeticItemIdSchema,
  cardBack: storedCosmeticItemIdSchema,
  raritySet: storedCosmeticItemIdSchema,
  avatarFrame: storedCosmeticItemIdSchema,
  revealAura: storedCosmeticItemIdSchema,
  banner: storedCosmeticItemIdSchema,
  nameStyle: storedCosmeticItemIdSchema,
  momentStamp: storedCosmeticItemIdSchema,
  openingTear: storedCosmeticItemIdSchema,
})

export const myCosmeticsResponseSchema = z.object({
  owned: ownedCosmeticItemIdsSchema,
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
  owned: ownedCosmeticItemIdsSchema,
  equipped: equippedCosmeticsSchema,
})

export const tryOnCardsResponseSchema = z.object({ cards: z.array(collectionCardSchema) })

export type EquippedCosmetics = z.infer<typeof equippedCosmeticsSchema>
export type MyCosmeticsResponse = z.infer<typeof myCosmeticsResponseSchema>
export type EquipCosmeticBody = z.infer<typeof equipCosmeticBodySchema>
export type PurchaseCosmeticBody = z.infer<typeof purchaseCosmeticBodySchema>
export type PurchaseCosmeticResponse = z.infer<typeof purchaseCosmeticResponseSchema>
export type TryOnCardsResponse = z.infer<typeof tryOnCardsResponseSchema>
