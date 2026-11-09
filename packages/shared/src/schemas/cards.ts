import { z } from 'zod'
import { CARD_TIERS, COPY_VARIANTS, parseCollectionCursor } from '../domain'
import { idSchema, isoDateSchema } from './common'
import { imageSetSchema } from './media'
import { cardTitleSchema } from './uploads'

export const cardTierSchema = z.enum(CARD_TIERS)

export const cardPersonSchema = z.object({
  userId: idSchema.nullable(),
  displayUsername: z.string().nullable(),
})

export const cardAuthorSchema = cardPersonSchema.extend({ isFormerMember: z.boolean() })

export const cardSummarySchema = z.object({
  id: z.uuid(),
  number: z.int().positive(),
  title: cardTitleSchema,
  tier: cardTierSchema,
  isProvisional: z.boolean(),
  author: cardAuthorSchema,
  thumbhash: z.string(),
  dominantColor: z.string().regex(/^#[0-9a-f]{6}$/),
  width: z.int().positive(),
  height: z.int().positive(),
  image: imageSetSchema,
})

export const collectionCursorSchema = z.string().transform((raw, ctx) => {
  const cursor = parseCollectionCursor(raw)
  if (cursor === null) {
    ctx.issues.push({ code: 'custom', message: 'Invalid collection cursor', input: raw })
    return z.NEVER
  }
  return cursor
})

export const listCardsQuerySchema = z.object({
  authorId: idSchema.optional(),
  tier: cardTierSchema.optional(),
  cursor: collectionCursorSchema.optional(),
  limit: z.coerce.number().int().min(1).max(200).default(120),
})

export const copyVariantSchema = z.enum(COPY_VARIANTS)

export const ownedCopiesSchema = z.object({
  normal: cardTierSchema.nullable(),
  foil: cardTierSchema.nullable(),
})

export const ownedCardSummarySchema = cardSummarySchema.extend({
  kind: z.literal('owned'),
  displayTier: cardTierSchema,
  copies: ownedCopiesSchema,
})

export const lockedCardSummarySchema = z.strictObject({
  kind: z.literal('locked'),
  id: z.uuid(),
  number: z.int().positive(),
  tier: cardTierSchema,
  isProvisional: z.boolean(),
  author: cardAuthorSchema,
  thumbhash: z.string(),
  dominantColor: z.string().regex(/^#[0-9a-f]{6}$/),
  width: z.int().positive(),
  height: z.int().positive(),
})

export const hiddenCardSummarySchema = z.strictObject({
  kind: z.literal('hidden'),
  id: z.uuid(),
  number: z.int().positive(),
  tier: cardTierSchema,
  thumbhash: z.string(),
  dominantColor: z.string().regex(/^#[0-9a-f]{6}$/),
  width: z.int().positive(),
  height: z.int().positive(),
  copies: ownedCopiesSchema,
})

export const collectionCardSchema = z.discriminatedUnion('kind', [
  ownedCardSummarySchema,
  lockedCardSummarySchema,
  hiddenCardSummarySchema,
])

export const collectionPageSchema = z.object({
  cards: z.array(collectionCardSchema),
  nextCursor: z.string().nullable(),
  total: z.int().min(0),
  ownedCount: z.int().min(0),
})

const reactionCountSchema = z.object({ count: z.int().min(0), isMine: z.boolean() })

export const reactionCountsSchema = z.object({
  fire: reactionCountSchema,
  heart: reactionCountSchema,
  star: reactionCountSchema,
})

export const ownedCardDetailSchema = ownedCardSummarySchema.extend({
  capturedAt: isoDateSchema.nullable(),
  isCaptureDateValidated: z.boolean(),
  createdAt: isoDateSchema,
  tagged: z.array(cardPersonSchema),
  discoveredBy: cardPersonSchema.nullable(),
  copiesInLeague: z.int().min(0),
  reactions: reactionCountsSchema,
  canReact: z.boolean(),
  canWithdraw: z.boolean(),
  actions: z.object({
    recycle: z.array(z.object({ variant: copyVariantSchema, dust: z.int().positive() })),
    foilUpgrade: z.object({
      cost: z.int().min(0),
      allowed: z.boolean(),
      reason: z.enum(['no_normal', 'foil_owned', 'insufficient_dust']).nullable(),
    }),
  }),
})

export const lockedCardDetailSchema = lockedCardSummarySchema.extend({
  createdAt: isoDateSchema,
  discoveredBy: cardPersonSchema.nullable(),
  canWithdraw: z.boolean(),
})

export const hiddenCardDetailSchema = hiddenCardSummarySchema.extend({
  createdAt: isoDateSchema,
  canWithdraw: z.boolean(),
})

export const viewerCardDetailSchema = z.discriminatedUnion('kind', [
  ownedCardDetailSchema,
  lockedCardDetailSchema,
  hiddenCardDetailSchema,
])

export const taggedCardSchema = z.object({
  id: z.uuid(),
  number: z.int().positive(),
  title: cardTitleSchema,
  tier: cardTierSchema,
  status: z.enum(['active', 'hidden']),
  author: cardAuthorSchema,
  thumbhash: z.string(),
  dominantColor: z.string().regex(/^#[0-9a-f]{6}$/),
  width: z.int().positive(),
  height: z.int().positive(),
  image: imageSetSchema,
  canWithdraw: z.literal(true),
})

export const cardParamsSchema = z.object({ leagueId: z.uuid(), cardId: z.uuid() })

export type CardPerson = z.infer<typeof cardPersonSchema>
export type CardAuthor = z.infer<typeof cardAuthorSchema>
export type CardSummary = z.infer<typeof cardSummarySchema>
export type ListCardsQuery = z.infer<typeof listCardsQuerySchema>
export type OwnedCardSummary = z.infer<typeof ownedCardSummarySchema>
export type HiddenCardSummary = z.infer<typeof hiddenCardSummarySchema>
export type LockedCardSummary = z.infer<typeof lockedCardSummarySchema>
export type CollectionCard = z.infer<typeof collectionCardSchema>
export type CollectionPage = z.infer<typeof collectionPageSchema>
export type OwnedCardDetail = z.infer<typeof ownedCardDetailSchema>
export type LockedCardDetail = z.infer<typeof lockedCardDetailSchema>
export type ViewerCardDetail = z.infer<typeof viewerCardDetailSchema>
export type ReactionCounts = z.infer<typeof reactionCountsSchema>
export type HiddenCardDetail = z.infer<typeof hiddenCardDetailSchema>
export type TaggedCard = z.infer<typeof taggedCardSchema>
