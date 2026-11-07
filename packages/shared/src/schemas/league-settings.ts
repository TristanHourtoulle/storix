import { z } from 'zod'
import { DEFAULT_BOOSTER_CADENCE, DEFAULT_RARITY_WEIGHTS } from '../domain'

const weightSchema = z.number().min(0).max(10)

export const leagueSettingsSchema = z.object({
  rarityWeights: z
    .object({
      uploaderScarcity: weightSchema,
      photoAge: weightSchema,
      reactions: weightSchema,
    })
    .refine((w) => w.uploaderScarcity + w.photoAge + w.reactions > 0)
    .default(DEFAULT_RARITY_WEIGHTS),
  booster: z
    .object({
      intervalMinutes: z.int().min(1).max(10_080),
      maxStock: z.int().min(1).max(20),
      joinGift: z.int().min(0).max(20),
    })
    .default(DEFAULT_BOOSTER_CADENCE),
})

export type LeagueSettings = z.infer<typeof leagueSettingsSchema>

/** Parses the raw league settings column, falling back to defaults on null or invalid data. */
export function resolveLeagueSettings(raw: unknown): LeagueSettings {
  const parsed = leagueSettingsSchema.safeParse(raw ?? {})
  return parsed.success ? parsed.data : leagueSettingsSchema.parse({})
}
