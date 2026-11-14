import { parisDayKey, parisLocalInstant } from './missions'

export const SERIES_KINDS = ['theme', 'event'] as const

export type SeriesKind = (typeof SERIES_KINDS)[number]

export const SERIES_PHASES = ['upcoming', 'live', 'grace', 'closed'] as const

export type SeriesPhase = (typeof SERIES_PHASES)[number]

export const SERIES_REWARD_MIN_CARDS = 5
export const SERIES_COMPLETE_DUST = 150
export const SERIES_RECAP_CARDS = 5
export const SERIES_TITLE_MAX_LENGTH = 40
export const SERIES_EMOJI_MAX_LENGTH = 16
export const SERIES_TICK_MINUTES = 10

export interface ThemeIdea {
  title: string
  emoji: string
  color: string
}

export const THEME_ROTATION: readonly ThemeIdea[] = [
  { title: 'Vert', emoji: '🌿', color: '#4ade80' },
  { title: 'Reflets', emoji: '🪞', color: '#a78bfa' },
  { title: 'Dans la cuisine', emoji: '🍳', color: '#fbbf24' },
  { title: "Vu d'en haut", emoji: '🛰️', color: '#22d3ee' },
  { title: 'Rouge', emoji: '🍒', color: '#f87171' },
  { title: 'Bleu', emoji: '🫐', color: '#60a5fa' },
  { title: 'Jaune', emoji: '🍋', color: '#facc15' },
  { title: 'Ombres', emoji: '🌘', color: '#94a3b8' },
  { title: 'Lumière du soir', emoji: '🌇', color: '#fb923c' },
  { title: 'Animaux', emoji: '🐾', color: '#f59e0b' },
  { title: 'Fenêtres', emoji: '🪟', color: '#67e8f9' },
  { title: 'Portes', emoji: '🚪', color: '#c084fc' },
  { title: 'Chaussures', emoji: '👟', color: '#f472b6' },
  { title: 'Ciel', emoji: '☁️', color: '#7dd3fc' },
  { title: 'Eau', emoji: '💧', color: '#38bdf8' },
  { title: 'Gourmandises', emoji: '🍰', color: '#f9a8d4' },
  { title: 'En mouvement', emoji: '💨', color: '#5eead4' },
  { title: 'Symétrie', emoji: '🦋', color: '#818cf8' },
  { title: 'Textures', emoji: '🧶', color: '#fca5a5' },
  { title: 'Graffitis', emoji: '🎨', color: '#e879f9' },
  { title: 'Fleurs', emoji: '🌸', color: '#f0abc1' },
  { title: 'Rétro', emoji: '📼', color: '#d97706' },
  { title: 'Mains', emoji: '🙌', color: '#fdba74' },
  { title: 'Les pieds dans…', emoji: '🦶', color: '#a3e635' },
  { title: 'Petit déj', emoji: '🥐', color: '#fcd34d' },
  { title: 'Lignes', emoji: '📏', color: '#a5b4fc' },
  { title: 'Rond', emoji: '⭕', color: '#fb7185' },
  { title: 'Nuit', emoji: '🌙', color: '#6366f1' },
  { title: 'Sur la route', emoji: '🛣️', color: '#a8a29e' },
  { title: 'Sport', emoji: '⚽', color: '#34d399' },
  { title: 'Musique', emoji: '🎸', color: '#c084fc' },
  { title: 'Livres', emoji: '📚', color: '#d6a46c' },
  { title: 'Plantes vertes', emoji: '🪴', color: '#22c55e' },
  { title: 'Au marché', emoji: '🧺', color: '#eab308' },
  { title: 'Selfie de groupe', emoji: '🤳', color: '#f472b6' },
  { title: 'Le plus vieux objet', emoji: '🕰️', color: '#b45309' },
  { title: 'Néons', emoji: '💡', color: '#e879f9' },
  { title: 'Météo du jour', emoji: '🌦️', color: '#93c5fd' },
  { title: 'Bureau', emoji: '🖥️', color: '#94a3b8' },
  { title: 'Câlin', emoji: '🫶', color: '#fda4af' },
]

export const DEFAULT_SERIES_COLOR = '#a78bfa'

const SERIES_COLORS: readonly string[] = [
  '#a78bfa',
  '#22d3ee',
  '#4ade80',
  '#f472b6',
  '#fbbf24',
  '#60a5fa',
  '#fb923c',
]

const DAY_MS = 86_400_000
const WEEK_MS = 7 * DAY_MS
const EPOCH_MONDAY = Date.UTC(2024, 0, 1)

const pad = (value: number): string => String(value).padStart(2, '0')

const keyOf = (utcMidnight: number): string => {
  const date = new Date(utcMidnight)
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`
}

const midnightOf = (key: string): number => {
  const [year = 0, month = 1, day = 1] = key.split('-').map(Number)
  return Date.UTC(year, month - 1, day)
}

/** Returns the `YYYY-MM-DD` key of the Monday that starts the theme week containing `now` (weeks start Monday 00:00 Paris). */
export function themeWeekKey(now: Date): string {
  const midnight = midnightOf(parisDayKey(now))
  const weekday = (new Date(midnight).getUTCDay() + 6) % 7
  return keyOf(midnight - weekday * DAY_MS)
}

/** Returns the [start, end) instants of a theme week, DST aware. */
export function themeWeekBounds(key: string): { start: Date; end: Date } {
  return {
    start: parisLocalInstant(key, 0),
    end: parisLocalInstant(keyOf(midnightOf(key) + WEEK_MS), 0),
  }
}

/** Returns the theme week key that follows `key`. */
export function nextThemeWeekKey(key: string): string {
  return keyOf(midnightOf(key) + WEEK_MS)
}

function hash32(input: string): number {
  let h = 0x811c9dc5
  for (const char of input) {
    h ^= char.codePointAt(0) ?? 0
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

function mulberry32(seed: number): () => number {
  let state = seed
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296
  }
}

function shuffledIndexes(length: number, seed: string): number[] {
  const next = mulberry32(hash32(seed))
  return Array.from({ length }, (_, index) => index).reduce<number[]>(
    (order, _, step) => {
      const i = length - 1 - step
      const j = Math.floor(next() * (i + 1))
      return order.with(i, order[j] ?? 0).with(j, order[i] ?? 0)
    },
    Array.from({ length }, (_, index) => index),
  )
}

/** Picks the rotation theme of a league for a week: a per-league shuffle of the list, no repeat before the list is used up. */
export function rotationThemeFor(
  leagueId: string,
  weekKey: string,
  ideas: readonly ThemeIdea[] = THEME_ROTATION,
): ThemeIdea {
  const weekIndex = Math.max(0, Math.round((midnightOf(weekKey) - EPOCH_MONDAY) / WEEK_MS))
  const cycle = Math.floor(weekIndex / ideas.length)
  const order = shuffledIndexes(ideas.length, `${leagueId}:${cycle}`)
  const idea = ideas[order[weekIndex % ideas.length] ?? 0]
  if (idea === undefined) throw new Error('Empty theme rotation')
  return idea
}

/** Returns a stable colour for a series without one of its own. */
export function seriesColorFor(seed: string): string {
  return SERIES_COLORS[hash32(seed) % SERIES_COLORS.length] ?? DEFAULT_SERIES_COLOR
}

export interface SeriesWindow {
  startsAt: Date
  endsAt: Date
  graceEndsAt: Date
  closedAt: Date | null
}

/** Returns where a series stands: not started, live, in its grace window, or closed. */
export function seriesPhase(series: SeriesWindow, now: Date): SeriesPhase {
  if (series.closedAt !== null || now >= series.graceEndsAt) return 'closed'
  if (now < series.startsAt) return 'upcoming'
  return now < series.endsAt ? 'live' : 'grace'
}

/** Tells whether a series still accepts cards at `now`. */
export function acceptsCards(series: SeriesWindow, now: Date): boolean {
  const phase = seriesPhase(series, now)
  return phase === 'live' || phase === 'grace'
}

/** Tells whether completing a series pays the reward: closed, with at least the minimum of cards. */
export function isRewardEligible(input: { isClosed: boolean; cardCount: number }): boolean {
  return input.isClosed && input.cardCount >= SERIES_REWARD_MIN_CARDS
}

/** Returns the whole days left before a live series ends, counting the current day (J-3 on Friday for a Monday end). */
export function daysLeft(endsAt: Date, now: Date): number {
  const lastDay = midnightOf(parisDayKey(new Date(endsAt.getTime() - 1)))
  const today = midnightOf(parisDayKey(now))
  return Math.max(0, Math.round((lastDay - today) / DAY_MS))
}

export interface SeriesContribution {
  userId: string
  cards: number
  firstAt: Date
}

/** Picks the most active member of a series: most cards, then the earliest first card. */
export function mostActive(contributions: readonly SeriesContribution[]): string | null {
  const best = contributions.toSorted(
    (a, b) => b.cards - a.cards || a.firstAt.getTime() - b.firstAt.getTime(),
  )[0]
  return best?.userId ?? null
}
