import {
  MYTHIC_MIN_CARDS,
  PITY_EPIC_AFTER,
  QUOTA_LOWER_BOUNDS,
  resolveLeagueSettings,
  type WalletState,
} from '@storix/shared'
import { formatDurationFr, formatEveryFr } from './format-duration'

export type StoryKey = 'goal' | 'rarity' | 'add' | 'boosters' | 'stacks' | 'install'

export type StoryTint = 'legendary' | 'epic' | 'uncommon' | 'rare' | 'cyan' | 'accent'

export interface Story {
  key: StoryKey
  tint: StoryTint
  title: string
  text: string
}

interface LeagueFacts {
  joinGift: number
  intervalMinutes: number
  maxStock: number
  newCardDelayMinutes: number
}

const SECONDS_PER_MINUTE = 60

const LEGENDARY_TOP_PERCENT = Math.round((1 - QUOTA_LOWER_BOUNDS.legendary) * 100)

export const MYTHIC_LINE = `La Mythique est la meilleure carte de la ligue, dès ${MYTHIC_MIN_CARDS} cartes.`

function leagueFactsOf(wallet: WalletState | undefined): LeagueFacts {
  if (wallet !== undefined) {
    return {
      joinGift: wallet.booster.joinGift,
      intervalMinutes: Math.round(wallet.booster.intervalSeconds / SECONDS_PER_MINUTE),
      maxStock: wallet.booster.maxStock,
      newCardDelayMinutes: wallet.pool.newCardDelayMinutes,
    }
  }
  const defaults = resolveLeagueSettings({})
  return {
    joinGift: defaults.booster.joinGift,
    intervalMinutes: defaults.booster.intervalMinutes,
    maxStock: defaults.booster.maxStock,
    newCardDelayMinutes: defaults.newCardDelayMinutes,
  }
}

function addText(newCardDelayMinutes: number): string {
  const lead = 'Viseur ou galerie, un cadrage, un titre.'
  if (newCardDelayMinutes === 0) return `${lead} Ta carte entre tout de suite dans les boosters.`
  return `${lead} Ta carte entre dans les boosters ${formatDurationFr(newCardDelayMinutes)} plus tard.`
}

function boostersTitle(joinGift: number, intervalMinutes: number): string {
  const every = formatEveryFr(intervalMinutes)
  if (joinGift === 0) return `1 booster ${every}`
  return `${joinGift} ${joinGift === 1 ? 'offert' : 'offerts'}, puis 1 ${every}`
}

/** Builds the five game stories that precede the install story, from the league's real settings. */
export function buildGameStories(wallet: WalletState | undefined): readonly Story[] {
  const facts = leagueFactsOf(wallet)
  return [
    {
      key: 'goal',
      tint: 'legendary',
      title: 'Tes photos deviennent des cartes',
      text: 'Chaque photo du groupe se collectionne. Ouvre des boosters pour les gagner.',
    },
    {
      key: 'rarity',
      tint: 'epic',
      title: 'La ligue décide de la rareté',
      text: `Top ${LEGENDARY_TOP_PERCENT} % = Légendaire. ${MYTHIC_LINE}`,
    },
    {
      key: 'add',
      tint: 'uncommon',
      title: 'Le + au centre',
      text: addText(facts.newCardDelayMinutes),
    },
    {
      key: 'boosters',
      tint: 'rare',
      title: boostersTitle(facts.joinGift, facts.intervalMinutes),
      text: `${facts.maxStock} en stock max. Épique garantie au ${PITY_EPIC_AFTER}e booster sans Épique.`,
    },
    {
      key: 'stacks',
      tint: 'cyan',
      title: "Tes doublons s'empilent",
      text: "À ×10, ta copie peut monter d'une rareté. Ou convertis tes doublons en paillettes.",
    },
  ]
}
