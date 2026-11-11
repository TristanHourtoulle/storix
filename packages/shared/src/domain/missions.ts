import { createSeededRandom, type RandomSource } from './random'

export const MISSION_RESET_HOUR = 5
export const MISSION_PERIODS = ['day', 'week'] as const
export const DAILY_MISSION_COUNT = 3
export const WEEKLY_MISSION_COUNT = 4
export const DAILY_REROLLS = 1

export type MissionPeriod = (typeof MISSION_PERIODS)[number]

export const MISSION_SOURCES = [
  'boosters',
  'reactions',
  'reaction_authors',
  'photos',
  'bravos',
  'discoveries',
  'member_visits',
  'self_tags',
  'showcase_edits',
  'promotions',
  'foils',
  'daily_streak',
  'moments_on_time',
] as const

export type MissionSource = (typeof MISSION_SOURCES)[number]

export interface MissionReward {
  dust: number
  boosters: number
}

export interface MissionDefinition {
  id: string
  period: MissionPeriod
  source: MissionSource
  target: number
  reward: MissionReward
  label: string
}

const dust = (amount: number): MissionReward => ({ dust: amount, boosters: 0 })

export const DAILY_BOOSTER_MISSION_IDS = ['open_boosters', 'open_many_boosters'] as const

export const DAILY_MISSIONS: readonly MissionDefinition[] = [
  {
    id: 'open_boosters',
    period: 'day',
    source: 'boosters',
    target: 2,
    reward: dust(40),
    label: 'Ouvre 2 boosters',
  },
  {
    id: 'open_many_boosters',
    period: 'day',
    source: 'boosters',
    target: 4,
    reward: dust(60),
    label: 'Ouvre 4 boosters',
  },
  {
    id: 'react',
    period: 'day',
    source: 'reactions',
    target: 3,
    reward: dust(25),
    label: 'Réagis à 3 cartes',
  },
  {
    id: 'react_authors',
    period: 'day',
    source: 'reaction_authors',
    target: 3,
    reward: dust(40),
    label: 'Réagis aux photos de 3 personnes',
  },
  {
    id: 'post_photo',
    period: 'day',
    source: 'photos',
    target: 1,
    reward: dust(50),
    label: 'Poste 1 photo',
  },
  {
    id: 'send_bravo',
    period: 'day',
    source: 'bravos',
    target: 1,
    reward: dust(25),
    label: 'Envoie 1 Bravo',
  },
  {
    id: 'discover',
    period: 'day',
    source: 'discoveries',
    target: 1,
    reward: dust(50),
    label: 'Découvre 1 carte',
  },
  {
    id: 'visit_member',
    period: 'day',
    source: 'member_visits',
    target: 1,
    reward: dust(15),
    label: "Visite la page d'un ami",
  },
  {
    id: 'tag_self',
    period: 'day',
    source: 'self_tags',
    target: 1,
    reward: dust(25),
    label: 'Identifie-toi sur une photo',
  },
  {
    id: 'edit_showcase',
    period: 'day',
    source: 'showcase_edits',
    target: 1,
    reward: dust(25),
    label: 'Change ta vitrine',
  },
  {
    id: 'moment_on_time',
    period: 'day',
    source: 'moments_on_time',
    target: 1,
    reward: dust(40),
    label: "Poste ton Moment à l'heure",
  },
]

export const WEEKLY_MISSIONS: readonly MissionDefinition[] = [
  {
    id: 'open_boosters',
    period: 'week',
    source: 'boosters',
    target: 15,
    reward: dust(120),
    label: 'Ouvre 15 boosters',
  },
  {
    id: 'post_photos',
    period: 'week',
    source: 'photos',
    target: 4,
    reward: dust(160),
    label: 'Poste 4 photos',
  },
  {
    id: 'react',
    period: 'week',
    source: 'reactions',
    target: 15,
    reward: dust(100),
    label: 'Réagis à 15 cartes',
  },
  {
    id: 'promote',
    period: 'week',
    source: 'promotions',
    target: 1,
    reward: dust(200),
    label: 'Améliore 1 carte',
  },
  {
    id: 'discover',
    period: 'week',
    source: 'discoveries',
    target: 3,
    reward: dust(160),
    label: 'Découvre 3 cartes',
  },
  {
    id: 'send_bravos',
    period: 'week',
    source: 'bravos',
    target: 5,
    reward: dust(80),
    label: 'Envoie 5 Bravo',
  },
  {
    id: 'foil',
    period: 'week',
    source: 'foils',
    target: 1,
    reward: dust(160),
    label: 'Passe 1 carte en foil',
  },
  {
    id: 'daily_streak',
    period: 'week',
    source: 'daily_streak',
    target: 5,
    reward: { dust: 0, boosters: 1 },
    label: 'Boucle tes missions du jour 5 jours',
  },
]

/** Returns the catalogue entry of a mission, or null when the id is unknown for that period. */
export function missionDefinition(period: MissionPeriod, id: string): MissionDefinition | null {
  const catalogue = period === 'day' ? DAILY_MISSIONS : WEEKLY_MISSIONS
  return catalogue.find((mission) => mission.id === id) ?? null
}

const PARIS_PARTS = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Paris',
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
})

const DAY_MS = 86_400_000

interface ParisParts {
  year: number
  month: number
  day: number
  hour: number
}

function parisParts(date: Date): ParisParts & { minute: number; second: number } {
  const parts = Object.fromEntries(
    PARIS_PARTS.formatToParts(date).map((part) => [part.type, part.value]),
  )
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  }
}

function parisOffsetMs(date: Date): number {
  const p = parisParts(date)
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second)
  return asUtc - Math.floor(date.getTime() / 1000) * 1000
}

const pad = (value: number): string => String(value).padStart(2, '0')

const keyOf = (utcMidnight: number): string => {
  const date = new Date(utcMidnight)
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`
}

const midnightOf = (key: string): number => {
  const [year = 0, month = 1, day = 1] = key.split('-').map(Number)
  return Date.UTC(year, month - 1, day)
}

/** Returns the `YYYY-MM-DD` Paris calendar day (midnight to midnight) containing `now`. */
export function parisDayKey(now: Date): string {
  const p = parisParts(now)
  return keyOf(Date.UTC(p.year, p.month - 1, p.day))
}

/** Returns the instant of `minutes` after Paris midnight on the day `key`, DST aware. */
export function parisLocalInstant(key: string, minutes: number): Date {
  const guess = midnightOf(key) + minutes * 60_000
  const first = guess - parisOffsetMs(new Date(guess))
  return new Date(guess - parisOffsetMs(new Date(first)))
}

/** Returns the `YYYY-MM-DD` key of the mission day containing `now` (days start at 05:00 Paris). */
export function missionDayKey(now: Date): string {
  const p = parisParts(now)
  const midnight = Date.UTC(p.year, p.month - 1, p.day)
  return keyOf(p.hour < MISSION_RESET_HOUR ? midnight - DAY_MS : midnight)
}

/** Returns the `YYYY-MM-DD` key of the Monday that starts the mission week containing `now`. */
export function missionWeekKey(now: Date): string {
  const midnight = midnightOf(missionDayKey(now))
  const weekday = (new Date(midnight).getUTCDay() + 6) % 7
  return keyOf(midnight - weekday * DAY_MS)
}

/** Returns the Paris 05:00 instant of a day key. */
export function periodStart(key: string): Date {
  return parisLocalInstant(key, MISSION_RESET_HOUR * 60)
}

/** Returns the [start, end) instants of a mission period. */
export function periodBounds(period: MissionPeriod, key: string): { start: Date; end: Date } {
  const days = period === 'day' ? 1 : 7
  return { start: periodStart(key), end: periodStart(keyOf(midnightOf(key) + days * DAY_MS)) }
}

/** Returns the day key that precedes `key`. */
export function previousDayKey(key: string): string {
  return keyOf(midnightOf(key) - DAY_MS)
}

/** Returns the day key that follows `key`. */
export function nextDayKey(key: string): string {
  return keyOf(midnightOf(key) + DAY_MS)
}

/** Returns the week key that precedes `key`. */
export function previousWeekKey(key: string): string {
  return keyOf(midnightOf(key) - 7 * DAY_MS)
}

/** Builds the string hashed (sha256) into a member's mission seed for one period. */
export function missionSeedInput(input: {
  leagueId: string
  userId: string
  period: MissionPeriod
  key: string
}): string {
  return `missions:${input.leagueId}:${input.userId}:${input.period}:${input.key}`
}

function drawDistinct<T>(pool: readonly T[], count: number, random: RandomSource): T[] {
  return Array.from({ length: Math.min(count, pool.length) }).reduce<{ picked: T[]; rest: T[] }>(
    (acc) => {
      const index = random.nextInt(acc.rest.length)
      const value = acc.rest[index]
      if (value === undefined) return acc
      return { picked: [...acc.picked, value], rest: acc.rest.toSpliced(index, 1) }
    },
    { picked: [], rest: [...pool] },
  ).picked
}

const isBoosterMission = (id: string): boolean =>
  (DAILY_BOOSTER_MISSION_IDS as readonly string[]).includes(id)

/** Draws the 3 daily missions: slot 0 is a booster mission, then 2 others avoiding yesterday's when possible. */
export function selectDailyMissions(
  seedHex: string,
  yesterdayIds: readonly string[],
): MissionDefinition[] {
  const random = createSeededRandom(seedHex)
  const boosterPool = DAILY_MISSIONS.filter((mission) => isBoosterMission(mission.id))
  const [first] = drawDistinct(boosterPool, 1, random)
  const others = DAILY_MISSIONS.filter((mission) => !isBoosterMission(mission.id))
  const fresh = others.filter((mission) => !yesterdayIds.includes(mission.id))
  const pool = fresh.length >= DAILY_MISSION_COUNT - 1 ? fresh : others
  const rest = drawDistinct(pool, DAILY_MISSION_COUNT - 1, random)
  return first === undefined ? rest : [first, ...rest]
}

/** Draws the 4 weekly missions. */
export function selectWeeklyMissions(seedHex: string): MissionDefinition[] {
  return drawDistinct(WEEKLY_MISSIONS, WEEKLY_MISSION_COUNT, createSeededRandom(seedHex))
}

/**
 * Draws a replacement daily mission for a slot, or null when none is left.
 * Slot 0 stays a booster mission; other slots avoid today's and, when possible, yesterday's missions.
 */
export function rerollDailyMission(input: {
  seedHex: string
  rerollIndex: number
  slot: number
  currentIds: readonly string[]
  yesterdayIds: readonly string[]
}): MissionDefinition | null {
  const random = createSeededRandom(input.seedHex)
  Array.from({ length: DAILY_MISSION_COUNT + input.rerollIndex }).forEach(() =>
    random.nextInt(DAILY_MISSIONS.length),
  )
  const candidates = DAILY_MISSIONS.filter(
    (mission) =>
      isBoosterMission(mission.id) === (input.slot === 0) && !input.currentIds.includes(mission.id),
  )
  const fresh = candidates.filter((mission) => !input.yesterdayIds.includes(mission.id))
  const [picked] = drawDistinct(fresh.length > 0 ? fresh : candidates, 1, random)
  return picked ?? null
}

/** Returns true when a mission's progress reaches its target. */
export function isMissionComplete(progress: number, target: number): boolean {
  return progress >= target
}
