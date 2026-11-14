import type { CardTier } from './cards'

/** The stats a ranking or trophy reads; mirrors the standings response `stats`. */
export interface StandingStats {
  uniqueCards: number
  copies: number
  rarityScore: number
  mythics: number
  legendaries: number
  foils: number
  bestFoilTier: number
  weekCards: number
  photos: number
  reactionsReceived: number
  muse: number
  boostersOpened: number
  dust: number
  promotions: number
  recycled: number
  discoveries: number
  mythicPulls: number
  onTimeMoments: number
  missions: number
  shopSpent: number
}

/** A ranked person: only what ordering needs. */
export interface StandingEntry {
  userId: string
  displayUsername: string
  joinedAt: string
  stats: StandingStats
}

export type StandingStat = keyof StandingStats

/** Rarity score of one distinct card at its current tier, for the Chasseur theme. */
export const RARITY_SCORE: Readonly<Record<CardTier, number>> = {
  common: 1,
  uncommon: 2,
  rare: 4,
  epic: 10,
  legendary: 25,
  mythic: 60,
}

export const STANDING_THEME_IDS = [
  'collector',
  'hunter',
  'foil',
  'photographer',
  'opener',
  'fortune',
  'week',
] as const
export type StandingThemeId = (typeof STANDING_THEME_IDS)[number]

export type StandingTieBreak = StandingStat | 'joinedAt' | 'name'

export interface StandingTheme {
  id: StandingThemeId
  label: string
  unit: string
  stat: StandingStat
  tieBreak: StandingTieBreak
}

/** The ranking themes, in chip order; Collectionneur is the default. */
export const STANDING_THEMES: readonly StandingTheme[] = [
  {
    id: 'collector',
    label: 'Collectionneur',
    unit: 'cartes',
    stat: 'uniqueCards',
    tieBreak: 'copies',
  },
  { id: 'hunter', label: 'Chasseur', unit: 'pts', stat: 'rarityScore', tieBreak: 'mythics' },
  { id: 'foil', label: 'Brillant', unit: 'brillantes', stat: 'foils', tieBreak: 'bestFoilTier' },
  {
    id: 'photographer',
    label: 'Photographe',
    unit: 'photos',
    stat: 'photos',
    tieBreak: 'reactionsReceived',
  },
  {
    id: 'opener',
    label: 'Ouvreur',
    unit: 'boosters',
    stat: 'boostersOpened',
    tieBreak: 'joinedAt',
  },
  { id: 'fortune', label: 'Fortune', unit: '✦', stat: 'dust', tieBreak: 'name' },
  {
    id: 'week',
    label: 'Cette semaine',
    unit: 'cartes',
    stat: 'weekCards',
    tieBreak: 'uniqueCards',
  },
]

export const DEFAULT_STANDING_THEME: StandingThemeId = 'collector'

/** Finds a theme, falling back to the default. */
export function standingTheme(id: StandingThemeId): StandingTheme {
  return STANDING_THEMES.find((theme) => theme.id === id) ?? (STANDING_THEMES[0] as StandingTheme)
}

export interface RankedEntry<T extends StandingEntry> {
  entry: T
  value: number
  position: number
  isTied: boolean
}

function compareTieBreak(a: StandingEntry, b: StandingEntry, tieBreak: StandingTieBreak): number {
  if (tieBreak === 'name') return 0
  if (tieBreak === 'joinedAt') return Date.parse(a.joinedAt) - Date.parse(b.joinedAt)
  return b.stats[tieBreak] - a.stats[tieBreak]
}

function compareNames(a: StandingEntry, b: StandingEntry): number {
  return a.displayUsername.localeCompare(b.displayUsername, 'fr')
}

/**
 * Orders people by a stat, highest first. Equal values share the position (and are flagged tied);
 * among them, the tie-break then the name decide the display order.
 */
export function rankBy<T extends StandingEntry>(
  entries: readonly T[],
  stat: StandingStat,
  tieBreak: StandingTieBreak = 'name',
): RankedEntry<T>[] {
  const sorted = entries.toSorted(
    (a, b) =>
      b.stats[stat] - a.stats[stat] || compareTieBreak(a, b, tieBreak) || compareNames(a, b),
  )
  return sorted.map((entry) => {
    const value = entry.stats[stat]
    const first = sorted.findIndex((other) => other.stats[stat] === value)
    const sharing = sorted.filter((other) => other.stats[stat] === value).length
    return { entry, value, position: first + 1, isTied: sharing > 1 }
  })
}

/** The ranking of a theme. */
export function rankStandings<T extends StandingEntry>(
  entries: readonly T[],
  themeId: StandingThemeId,
): RankedEntry<T>[] {
  const theme = standingTheme(themeId)
  return rankBy(entries, theme.stat, theme.tieBreak)
}

/** The podium appears from three members; smaller leagues only get the list. */
export const PODIUM_MIN_MEMBERS = 3

export const TROPHY_IDS = [
  'myth',
  'leg',
  'open',
  'alch',
  'recy',
  'rich',
  'foil',
  'disc',
  'photo',
  'muse',
  'luck',
  'moment',
  'miss',
  'shop',
] as const
export type TrophyId = (typeof TROPHY_IDS)[number]

export interface TrophyDefinition {
  id: TrophyId
  name: string
  rule: string
  stat: StandingStat
}

/** The 14 individual trophies, in grid order. */
export const TROPHIES: readonly TrophyDefinition[] = [
  { id: 'myth', name: 'Mythomane', rule: 'Le plus de Mythiques possédées', stat: 'mythics' },
  { id: 'leg', name: 'Légende', rule: 'Le plus de Légendaires possédées', stat: 'legendaries' },
  { id: 'open', name: 'Ouvreur fou', rule: 'Le plus de boosters ouverts', stat: 'boostersOpened' },
  {
    id: 'alch',
    name: 'Alchimiste',
    rule: 'Le plus d’améliorations de rareté (10 exemplaires + paillettes)',
    stat: 'promotions',
  },
  {
    id: 'recy',
    name: 'Recycleur',
    rule: 'Le plus de doublons recyclés (cartes et piles converties)',
    stat: 'recycled',
  },
  {
    id: 'rich',
    name: 'Crésus',
    rule: 'Le plus de paillettes en poche, à l’instant T',
    stat: 'dust',
  },
  { id: 'foil', name: 'Orfèvre', rule: 'Le plus de cartes brillantes', stat: 'foils' },
  {
    id: 'disc',
    name: 'Explorateur',
    rule: 'Le plus de découvertes : premier de la ligue à tirer une carte',
    stat: 'discoveries',
  },
  { id: 'photo', name: 'Photographe', rule: 'Le plus de photos devenues cartes', stat: 'photos' },
  {
    id: 'muse',
    name: 'Muse',
    rule: 'Ses photos sont dans le plus de collections (exemplaires chez les autres)',
    stat: 'muse',
  },
  {
    id: 'luck',
    name: 'Main heureuse',
    rule: 'Le plus de Mythiques tirées en booster',
    stat: 'mythicPulls',
  },
  {
    id: 'moment',
    name: 'Ponctuel',
    rule: 'Le plus de Moments postés à l’heure',
    stat: 'onTimeMoments',
  },
  { id: 'miss', name: 'Assidu', rule: 'Le plus de missions accomplies', stat: 'missions' },
  {
    id: 'shop',
    name: 'Mécène',
    rule: 'Le plus de paillettes dépensées en Boutique',
    stat: 'shopSpent',
  },
]

export interface TrophyStanding<T extends StandingEntry> {
  trophy: TrophyDefinition
  holders: T[]
  value: number
  top: RankedEntry<T>[]
}

/** How many people the trophy sheet lists. */
export const TROPHY_TOP_SIZE = 3

/**
 * Who holds a trophy: everyone at the best value, shared on a tie; nobody while the best is 0.
 * `top` lists the first three with a non-zero value, and every holder when more than three tie.
 */
export function trophyStanding<T extends StandingEntry>(
  entries: readonly T[],
  trophy: TrophyDefinition,
): TrophyStanding<T> {
  const ranked = rankBy(entries, trophy.stat).filter((row) => row.value > 0)
  const value = ranked[0]?.value ?? 0
  return {
    trophy,
    holders: ranked.filter((row) => row.value === value).map((row) => row.entry),
    value,
    top: ranked.filter((row, index) => index < TROPHY_TOP_SIZE || row.value === value),
  }
}
