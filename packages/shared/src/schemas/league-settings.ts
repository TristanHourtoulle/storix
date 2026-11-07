import { z } from 'zod'
import {
  CARD_TIERS,
  DEFAULT_BOOSTER_CADENCE,
  DEFAULT_NEW_CARD_DELAY_MINUTES,
  DEFAULT_RARITY_WEIGHTS,
  DEFAULT_UPLOAD_QUOTA_PER_DAY,
} from '../domain'

const weightSchema = z.number().min(0).max(10)

const rarityWeightsShape = z.object({
  uploaderScarcity: weightSchema,
  photoAge: weightSchema,
  reactions: weightSchema,
})

const hasPositiveWeight = (w: { uploaderScarcity: number; photoAge: number; reactions: number }) =>
  w.uploaderScarcity + w.photoAge + w.reactions > 0

const rarityWeightsSchema = rarityWeightsShape.refine(hasPositiveWeight)

const weightsPathIssue = {
  path: ['rarityWeights'],
  message: 'At least one weight must be positive',
}

const boosterSchema = z.object({
  intervalMinutes: z.int().min(1).max(10_080),
  maxStock: z.int().min(1).max(20),
  joinGift: z.int().min(0).max(20),
})

const uploadQuotaSchema = z.int().min(1).max(50)
const newCardDelaySchema = z.int().min(0).max(10_080)

export const leagueSettingsSchema = z.object({
  rarityWeights: rarityWeightsSchema.default(DEFAULT_RARITY_WEIGHTS),
  booster: boosterSchema.default(DEFAULT_BOOSTER_CADENCE),
  uploadQuotaPerDay: uploadQuotaSchema.default(DEFAULT_UPLOAD_QUOTA_PER_DAY),
  newCardDelayMinutes: newCardDelaySchema.default(DEFAULT_NEW_CARD_DELAY_MINUTES),
})

export const updateLeagueSettingsBodySchema = z
  .object({
    rarityWeights: rarityWeightsShape,
    booster: boosterSchema,
    uploadQuotaPerDay: uploadQuotaSchema,
    newCardDelayMinutes: newCardDelaySchema,
  })
  .refine((body) => hasPositiveWeight(body.rarityWeights), weightsPathIssue)

const tierCountSchema = z.int().min(0)

const tierDistributionSchema = z.object(
  Object.fromEntries(CARD_TIERS.map((tier) => [tier, tierCountSchema])) as Record<
    (typeof CARD_TIERS)[number],
    typeof tierCountSchema
  >,
)

export const leagueSettingsViewSchema = z.object({
  settings: leagueSettingsSchema,
  mythicCount: z.int().min(0),
  mythicCap: z.literal(3),
})

export const rarityPreviewBodySchema = z
  .object({ rarityWeights: rarityWeightsShape })
  .refine((body) => hasPositiveWeight(body.rarityWeights), weightsPathIssue)

export const rarityPreviewSchema = z.object({
  current: tierDistributionSchema,
  preview: tierDistributionSchema,
  changed: z.int().min(0),
  total: z.int().min(0),
})

export type LeagueSettings = z.infer<typeof leagueSettingsSchema>
export type UpdateLeagueSettingsBody = z.infer<typeof updateLeagueSettingsBodySchema>
export type LeagueSettingsView = z.infer<typeof leagueSettingsViewSchema>
export type RarityPreviewBody = z.infer<typeof rarityPreviewBodySchema>
export type RarityPreview = z.infer<typeof rarityPreviewSchema>

/** Parses the raw league settings column field by field, falling back to each field's default. */
export function resolveLeagueSettings(raw: unknown): LeagueSettings {
  const parsedSource = z.record(z.string(), z.unknown()).safeParse(raw)
  const source = parsedSource.success ? parsedSource.data : {}
  const defaults = leagueSettingsSchema.parse({})
  const pick = <K extends keyof LeagueSettings>(
    key: K,
    schema: z.ZodType<LeagueSettings[K]>,
  ): LeagueSettings[K] => {
    const parsed = schema.safeParse(source[key])
    return parsed.success ? parsed.data : defaults[key]
  }
  return {
    rarityWeights: pick('rarityWeights', rarityWeightsSchema),
    booster: pick('booster', boosterSchema),
    uploadQuotaPerDay: pick('uploadQuotaPerDay', uploadQuotaSchema),
    newCardDelayMinutes: pick('newCardDelayMinutes', newCardDelaySchema),
  }
}
