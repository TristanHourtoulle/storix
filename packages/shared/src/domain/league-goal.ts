export const GOAL_TYPES = ['photos', 'boosters', 'reactions', 'discoveries', 'bravos'] as const

export type GoalType = (typeof GOAL_TYPES)[number]

export const GOAL_STATUSES = ['active', 'reached', 'bonus', 'missed'] as const

export type GoalStatus = (typeof GOAL_STATUSES)[number]

export const GOAL_RATES: Readonly<Record<GoalType, number>> = {
  photos: 4,
  boosters: 12,
  reactions: 15,
  discoveries: 3,
  bravos: 3,
}

export const GOAL_BONUS_RATIO = 1.5
export const GOAL_REWARD_BOOSTERS = 2
export const GOAL_BONUS_PREMIUM_GIFTS = 1
export const GOAL_ACTIVE_WINDOW_DAYS = 14
export const GOAL_FAST_DAYS = 4
export const GOAL_FACTOR_MIN = 0.7
export const GOAL_FACTOR_MAX = 1.5
export const GOAL_CONTRIBUTOR_AVATARS = 4

const ODD_WEEK_TYPES: readonly GoalType[] = ['boosters', 'reactions', 'discoveries', 'bravos']

function isoWeekOf(weekKey: string): number {
  const [year = 0, month = 1, day = 1] = weekKey.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  const thursday = new Date(date.getTime() + (3 - ((date.getUTCDay() + 6) % 7)) * 86_400_000)
  const yearStart = Date.UTC(thursday.getUTCFullYear(), 0, 1)
  return Math.floor((thursday.getTime() - yearStart) / 86_400_000 / 7) + 1
}

/** Returns the goal type of a week: photos on even ISO weeks, a rotating type on odd ones. */
export function goalTypeForWeek(weekKey: string): GoalType {
  const week = isoWeekOf(weekKey)
  if (week % 2 === 0) return 'photos'
  return ODD_WEEK_TYPES[((week - 1) / 2) % ODD_WEEK_TYPES.length] ?? 'boosters'
}

/** Returns the weekly target for a goal type, scaled by active members and the smoothing factor. */
export function goalTarget(type: GoalType, activeMembers: number, factor: number): number {
  return Math.max(1, Math.ceil(GOAL_RATES[type] * Math.max(1, activeMembers) * factor))
}

/** Returns the bonus tier reached at 150 % of the target. */
export function bonusTarget(target: number): number {
  return Math.ceil(target * GOAL_BONUS_RATIO)
}

/** Returns the factor for next week's target: +10 % after a fast reach, −10 % after a miss, clamped. */
export function nextGoalFactor(previous: {
  factor: number
  status: GoalStatus
  reachedWithinDays: number | null
}): number {
  const fast =
    previous.status !== 'missed' &&
    previous.status !== 'active' &&
    previous.reachedWithinDays !== null &&
    previous.reachedWithinDays < GOAL_FAST_DAYS
  const scaled =
    previous.status === 'missed'
      ? previous.factor * 0.9
      : fast
        ? previous.factor * 1.1
        : previous.factor
  const clamped = Math.min(GOAL_FACTOR_MAX, Math.max(GOAL_FACTOR_MIN, scaled))
  return Math.round(clamped * 100) / 100
}
