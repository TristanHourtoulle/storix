import type { GoalType } from '@storix/shared'

interface GoalWording {
  verb: string
  unit: (count: number) => string
  friendsDid: (count: number) => string
}

const plural = (count: number, one: string, many: string): string => (count > 1 ? many : one)

export const GOAL_WORDING: Readonly<Record<GoalType, GoalWording>> = {
  photos: {
    verb: 'Postez',
    unit: (count) => plural(count, 'photo', 'photos'),
    friendsDid: (count) => `${count} ${plural(count, 'ami a posté', 'amis ont posté')}`,
  },
  boosters: {
    verb: 'Ouvrez',
    unit: (count) => plural(count, 'booster', 'boosters'),
    friendsDid: (count) => `${count} ${plural(count, 'ami a ouvert', 'amis ont ouvert')}`,
  },
  reactions: {
    verb: 'Envoyez',
    unit: (count) => plural(count, 'réaction', 'réactions'),
    friendsDid: (count) => `${count} ${plural(count, 'ami a réagi', 'amis ont réagi')}`,
  },
  discoveries: {
    verb: 'Découvrez',
    unit: (count) => plural(count, 'carte', 'cartes'),
    friendsDid: (count) => `${count} ${plural(count, 'ami a découvert', 'amis ont découvert')}`,
  },
  bravos: {
    verb: 'Envoyez',
    unit: (count) => plural(count, 'Bravo', 'Bravo'),
    friendsDid: (count) => `${count} ${plural(count, 'ami a félicité', 'amis ont félicité')}`,
  },
}

/** "48 photos" for a goal type and an amount. */
export function goalAmount(type: GoalType, count: number): string {
  return `${count} ${GOAL_WORDING[type].unit(count)}`
}
