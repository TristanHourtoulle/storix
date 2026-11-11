import type { MissionReward, MissionSource } from '@storix/shared'
import type { IconName } from '@/components/ui/icon'

export const MISSION_ICONS: Readonly<Record<MissionSource, IconName>> = {
  boosters: 'pack',
  reactions: 'fire',
  reaction_authors: 'user',
  photos: 'camera',
  bravos: 'clap',
  discoveries: 'eye',
  member_visits: 'user',
  self_tags: 'shot',
  showcase_edits: 'grid',
  promotions: 'star',
  foils: 'gem',
  daily_streak: 'check',
  moments_on_time: 'flip',
}

const NUMBER_FORMAT = new Intl.NumberFormat('fr-FR')

/** The booster part of a reward: "+1 booster" or "+2 boosters". */
export function boosterRewardLabel(reward: MissionReward): string {
  return `+${reward.boosters} ${reward.boosters > 1 ? 'boosters' : 'booster'}`
}

/** A dust amount formatted for French copy. */
export function dustLabel(amount: number): string {
  return NUMBER_FORMAT.format(amount)
}
