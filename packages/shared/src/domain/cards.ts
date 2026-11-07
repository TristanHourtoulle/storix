export const CARD_TIERS = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'] as const

export type CardTier = (typeof CARD_TIERS)[number]

export const PROVISIONAL_TIER: CardTier = 'common'

export const CARD_TITLE_MAX_LENGTH = 40
