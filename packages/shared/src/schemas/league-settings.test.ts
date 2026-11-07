import { describe, expect, it } from 'vitest'
import { resolveLeagueSettings, updateLeagueSettingsBodySchema } from './league-settings'

const valid = {
  rarityWeights: { uploaderScarcity: 1, photoAge: 2, reactions: 0 },
  booster: { intervalMinutes: 1, maxStock: 6, joinGift: 2 },
  uploadQuotaPerDay: 10,
  newCardDelayMinutes: 0,
}

describe('updateLeagueSettingsBodySchema', () => {
  it('accepts edge values', () => {
    expect(updateLeagueSettingsBodySchema.parse(valid)).toEqual(valid)
  })

  it('rejects all-zero weights, bad cadence and quota', () => {
    const zeroWeights = { uploaderScarcity: 0, photoAge: 0, reactions: 0 }
    expect(
      updateLeagueSettingsBodySchema.safeParse({ ...valid, rarityWeights: zeroWeights }).success,
    ).toBe(false)
    expect(
      updateLeagueSettingsBodySchema.safeParse({
        ...valid,
        booster: { ...valid.booster, intervalMinutes: 0 },
      }).success,
    ).toBe(false)
    expect(
      updateLeagueSettingsBodySchema.safeParse({ ...valid, uploadQuotaPerDay: 0 }).success,
    ).toBe(false)
  })

  it('bounds the new-card delay to 0..10080 integers', () => {
    expect(
      updateLeagueSettingsBodySchema.safeParse({ ...valid, newCardDelayMinutes: -1 }).success,
    ).toBe(false)
    expect(
      updateLeagueSettingsBodySchema.safeParse({ ...valid, newCardDelayMinutes: 10_081 }).success,
    ).toBe(false)
    expect(
      updateLeagueSettingsBodySchema.safeParse({ ...valid, newCardDelayMinutes: 1.5 }).success,
    ).toBe(false)
    expect(
      updateLeagueSettingsBodySchema.safeParse({ ...valid, newCardDelayMinutes: 0 }).success,
    ).toBe(true)
  })
})

describe('resolveLeagueSettings', () => {
  it('resolves stored settings field by field', () => {
    expect(resolveLeagueSettings(null).newCardDelayMinutes).toBe(60)
    const partial = resolveLeagueSettings({ uploadQuotaPerDay: 3, booster: 'garbage' })
    expect(partial.uploadQuotaPerDay).toBe(3)
    expect(partial.booster).toEqual({ intervalMinutes: 240, maxStock: 6, joinGift: 2 })
  })
})
