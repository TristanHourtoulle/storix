import { type CardTier, tierRank } from './cards'

export const EMBLEM_IDS = [
  'first-booster',
  'first-photo',
  'photographer',
  'collector',
  'fan-club',
  'golden',
  'discoverer',
  'shiny',
  'crush',
  'stacker',
  'upgrader',
  'legend',
  'archivist',
  'mythic',
  'muse',
  'on-time',
] as const

export type EmblemId = (typeof EMBLEM_IDS)[number]

export interface EmblemStats {
  boostersOpened: number
  premiumOpened: number
  photosPosted: number
  distinctOwned: number
  activeCards: number
  reactionsGiven: number
  discoveries: number
  stackedTotal: number
  foilCards: number
  maxReactionsOnOwnPhoto: number
  promotedCopies: number
  legendaryPulls: number
  mythicPulls: number
  ownMythicPhotos: number
  momentsOnTime: number
}

export type EmblemMetric = keyof EmblemStats

export interface EmblemDefinition {
  id: EmblemId
  name: string
  rule: string
  tier: CardTier
  metric: EmblemMetric
  target: number
}

export interface EmblemProgress {
  id: EmblemId
  progress: number
  target: number
  isEarned: boolean
}

export const ARCHIVIST_MIN_ACTIVE_CARDS = 20
export const ARCHIVIST_SHARE = 0.8
export const GOLDEN_PROGRESS_BOOSTERS = 20
export const FEATURED_EMBLEMS_MAX = 3

export const EMBLEM_CATALOGUE: readonly EmblemDefinition[] = [
  {
    id: 'first-booster',
    name: 'Premier booster',
    rule: 'Ouvre ton premier booster.',
    tier: 'common',
    metric: 'boostersOpened',
    target: 1,
  },
  {
    id: 'first-photo',
    name: 'Premier cliché',
    rule: 'Publie ta première photo.',
    tier: 'common',
    metric: 'photosPosted',
    target: 1,
  },
  {
    id: 'photographer',
    name: 'Photographe',
    rule: 'Publie 10 photos.',
    tier: 'uncommon',
    metric: 'photosPosted',
    target: 10,
  },
  {
    id: 'collector',
    name: 'Collectionneur',
    rule: 'Possède 25 cartes différentes.',
    tier: 'uncommon',
    metric: 'distinctOwned',
    target: 25,
  },
  {
    id: 'fan-club',
    name: 'Fan club',
    rule: 'Donne 30 réactions.',
    tier: 'uncommon',
    metric: 'reactionsGiven',
    target: 30,
  },
  {
    id: 'golden',
    name: 'Doré',
    rule: 'Ouvre un booster premium.',
    tier: 'rare',
    metric: 'premiumOpened',
    target: 1,
  },
  {
    id: 'discoverer',
    name: 'Découvreur',
    rule: 'Découvre 10 cartes en premier.',
    tier: 'rare',
    metric: 'discoveries',
    target: 10,
  },
  {
    id: 'shiny',
    name: 'Brillant',
    rule: 'Possède 5 cartes brillantes différentes.',
    tier: 'rare',
    metric: 'foilCards',
    target: 5,
  },
  {
    id: 'crush',
    name: 'Coup de cœur',
    rule: 'Une de tes photos reçoit 10 réactions.',
    tier: 'rare',
    metric: 'maxReactionsOnOwnPhoto',
    target: 10,
  },
  {
    id: 'stacker',
    name: 'Empileur',
    rule: 'Garde 100 doublons empilés.',
    tier: 'epic',
    metric: 'stackedTotal',
    target: 100,
  },
  {
    id: 'upgrader',
    name: 'Améliorateur',
    rule: 'Améliore 3 cartes.',
    tier: 'epic',
    metric: 'promotedCopies',
    target: 3,
  },
  {
    id: 'legend',
    name: 'Légende',
    rule: 'Tire une carte Légendaire ou mieux.',
    tier: 'legendary',
    metric: 'legendaryPulls',
    target: 1,
  },
  {
    id: 'archivist',
    name: 'Archiviste',
    rule: 'Possède 80 % des cartes de la ligue (dès 20 cartes).',
    tier: 'legendary',
    metric: 'distinctOwned',
    target: ARCHIVIST_MIN_ACTIVE_CARDS,
  },
  {
    id: 'mythic',
    name: 'Mythique',
    rule: 'Tire une carte Mythique.',
    tier: 'mythic',
    metric: 'mythicPulls',
    target: 1,
  },
  {
    id: 'muse',
    name: 'Muse',
    rule: 'Une de tes photos devient Mythique.',
    tier: 'mythic',
    metric: 'ownMythicPhotos',
    target: 1,
  },
  {
    id: 'on-time',
    name: "Pile à l'heure",
    rule: "Poste 10 Moments à l'heure.",
    tier: 'rare',
    metric: 'momentsOnTime',
    target: 10,
  },
]

function archivistTarget(activeCards: number): number {
  return Math.max(ARCHIVIST_MIN_ACTIVE_CARDS, Math.ceil(activeCards * ARCHIVIST_SHARE))
}

function evaluateOne(emblem: EmblemDefinition, stats: EmblemStats): EmblemProgress {
  if (emblem.id === 'golden' && stats.premiumOpened < emblem.target) {
    return {
      id: emblem.id,
      progress: Math.min(stats.boostersOpened, GOLDEN_PROGRESS_BOOSTERS),
      target: GOLDEN_PROGRESS_BOOSTERS,
      isEarned: false,
    }
  }
  if (emblem.id === 'golden') {
    return {
      id: emblem.id,
      progress: GOLDEN_PROGRESS_BOOSTERS,
      target: GOLDEN_PROGRESS_BOOSTERS,
      isEarned: true,
    }
  }
  const target = emblem.id === 'archivist' ? archivistTarget(stats.activeCards) : emblem.target
  const value = stats[emblem.metric]
  const meetsMinimum = emblem.id !== 'archivist' || stats.activeCards >= ARCHIVIST_MIN_ACTIVE_CARDS
  return {
    id: emblem.id,
    progress: Math.min(value, target),
    target,
    isEarned: meetsMinimum && value >= target,
  }
}

/** Evaluates every emblem of the catalogue against a member's stats, in catalogue order. */
export function evaluateEmblems(stats: EmblemStats): EmblemProgress[] {
  return EMBLEM_CATALOGUE.map((emblem) => evaluateOne(emblem, stats))
}

/** Returns the catalogue entry for an emblem id. */
export function emblemDefinition(id: EmblemId): EmblemDefinition {
  const found = EMBLEM_CATALOGUE.find((emblem) => emblem.id === id)
  if (found === undefined) throw new Error(`Unknown emblem ${id}`)
  return found
}

/** Returns true when the value is a known emblem id. */
export function isEmblemId(value: string): value is EmblemId {
  return (EMBLEM_IDS as readonly string[]).includes(value)
}

/** Picks the header emblems when the member chose none: rarest tier first, then most recently earned. */
export function featuredFallback(earned: readonly { id: EmblemId; earnedAt: Date }[]): EmblemId[] {
  return earned
    .toSorted(
      (a, b) =>
        tierRank(emblemDefinition(b.id).tier) - tierRank(emblemDefinition(a.id).tier) ||
        b.earnedAt.getTime() - a.earnedAt.getTime(),
    )
    .slice(0, FEATURED_EMBLEMS_MAX)
    .map((emblem) => emblem.id)
}
