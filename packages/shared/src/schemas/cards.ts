import { z } from 'zod'
import {
  CARD_TIERS,
  COLLECTION_SORTS,
  COPY_VARIANTS,
  DEFAULT_COLLECTION_SORT,
  JOURNEY_CAUSES,
  LEGACY_COLLECTION_CURSOR,
  cursorSort,
  parseCollectionCursor,
} from '../domain'
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

export const legacyCollectionCursorSchema = z
  .string()
  .regex(/^[1-9]\d{0,9}$/)
  .transform(() => LEGACY_COLLECTION_CURSOR)

export const collectionSortSchema = z.enum(COLLECTION_SORTS)

export const listCardsQuerySchema = z
  .object({
    authorId: idSchema.optional(),
    tier: cardTierSchema.optional(),
    upgradable: z.stringbool().optional(),
    taggedUserId: idSchema.optional(),
    revealOwn: z.stringbool().optional(),
    sort: collectionSortSchema.default(DEFAULT_COLLECTION_SORT),
    cursor: z.union([legacyCollectionCursorSchema, collectionCursorSchema]).optional(),
    limit: z.coerce.number().int().min(1).max(200).default(120),
  })
  .superRefine((query, ctx) => {
    if (query.cursor === undefined || query.cursor === LEGACY_COLLECTION_CURSOR) return
    if (cursorSort(query.cursor) !== query.sort) {
      ctx.addIssue({ code: 'custom', path: ['cursor'], message: 'Cursor does not match sort' })
    }
  })

export const copyVariantSchema = z.enum(COPY_VARIANTS)

export const stackEntrySchema = z.object({
  variant: copyVariantSchema,
  tierAtMint: cardTierSchema,
  count: z.int().positive(),
})

export const promotionActionSchema = z.object({
  from: cardTierSchema,
  to: cardTierSchema.nullable(),
  cost: z.int().min(0).nullable(),
  copiesRequired: z.int().positive(),
  copiesAvailable: z.int().min(0),
  allowed: z.boolean(),
  reason: z.enum(['not_owned', 'max_tier', 'not_enough_copies', 'insufficient_dust']).nullable(),
})

export const promotedHolderSchema = z.object({ holder: cardPersonSchema, tier: cardTierSchema })

export const ownedCopiesSchema = z.object({
  normal: cardTierSchema.nullable(),
  foil: cardTierSchema.nullable(),
})

export const ownedCardSummarySchema = cardSummarySchema.extend({
  kind: z.literal('owned'),
  displayTier: cardTierSchema,
  copies: ownedCopiesSchema,
  isPromoted: z.boolean(),
  stackCount: z.int().min(0),
  discoveredAt: isoDateSchema,
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
  discoveredAt: isoDateSchema.nullable(),
})

export const unpulledCardSummarySchema = z.strictObject({
  kind: z.literal('unpulled'),
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

export const collectionCardSchema = z.discriminatedUnion('kind', [
  ownedCardSummarySchema,
  lockedCardSummarySchema,
  hiddenCardSummarySchema,
  unpulledCardSummarySchema,
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
  promotedHolders: z.array(promotedHolderSchema).max(50),
  actions: z.object({
    recycle: z.array(
      z.object({
        variant: copyVariantSchema,
        dust: z.int().positive(),
        promotedTier: cardTierSchema.nullable(),
      }),
    ),
    stack: z.array(stackEntrySchema),
    promotion: promotionActionSchema,
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
  taggedAt: isoDateSchema,
})

export const cardParamsSchema = z.object({ leagueId: z.uuid(), cardId: z.uuid() })

export type CardPerson = z.infer<typeof cardPersonSchema>
export type CardAuthor = z.infer<typeof cardAuthorSchema>
export type CardSummary = z.infer<typeof cardSummarySchema>
export type ListCardsQuery = z.infer<typeof listCardsQuerySchema>
export type OwnedCardSummary = z.infer<typeof ownedCardSummarySchema>
export type HiddenCardSummary = z.infer<typeof hiddenCardSummarySchema>
export type LockedCardSummary = z.infer<typeof lockedCardSummarySchema>
export type UnpulledCardSummary = z.infer<typeof unpulledCardSummarySchema>
export type CollectionCard = z.infer<typeof collectionCardSchema>
export type CollectionPage = z.infer<typeof collectionPageSchema>
export type OwnedCardDetail = z.infer<typeof ownedCardDetailSchema>
export type LockedCardDetail = z.infer<typeof lockedCardDetailSchema>
export type ViewerCardDetail = z.infer<typeof viewerCardDetailSchema>
export type ReactionCounts = z.infer<typeof reactionCountsSchema>
export type HiddenCardDetail = z.infer<typeof hiddenCardDetailSchema>
export type TaggedCard = z.infer<typeof taggedCardSchema>
export type StackEntryView = z.infer<typeof stackEntrySchema>
export type PromotionAction = z.infer<typeof promotionActionSchema>
export type PromotedHolder = z.infer<typeof promotedHolderSchema>

export const MAX_JOURNEY_STEPS = 60

export const journeyStepSchema = z.object({
  kind: z.enum(['league', 'mine']),
  tier: cardTierSchema,
  at: isoDateSchema,
  cause: z.enum(JOURNEY_CAUSES).nullable(),
})

export const rarityHistorySchema = z.object({
  steps: z.array(journeyStepSchema).max(MAX_JOURNEY_STEPS),
})

export type RarityHistory = z.infer<typeof rarityHistorySchema>
