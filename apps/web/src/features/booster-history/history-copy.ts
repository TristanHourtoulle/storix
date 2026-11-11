import type { BoosterHistoryOpening, BoosterHistoryPull } from '@storix/shared'
import { groupByParisDay, parisClock } from '@/lib/paris-dates'

export interface HistoryDayGroup {
  key: string
  label: string
  openings: BoosterHistoryOpening[]
}

/** Groups openings, newest first, by their Paris calendar day. */
export function groupByDay(
  openings: readonly BoosterHistoryOpening[],
  now: Date = new Date(),
): HistoryDayGroup[] {
  return groupByParisDay(openings, (opening) => opening.openedAt, now).map(
    ({ key, label, items }) => ({ key, label, openings: items }),
  )
}

/** Formats the opening time in Paris, e.g. "14:02". */
export function openingTime(iso: string): string {
  return parisClock(iso)
}

/** Labels what a pull gave: new card, upgrade, stacked duplicate or dust from an older booster. */
export function pullOutcomeLabel(pull: BoosterHistoryPull): string {
  if (pull.outcome === 'new') return pull.isDiscovery ? 'découverte' : 'nouvelle'
  if (pull.outcome === 'upgraded') return 'améliorée'
  if (pull.dust > 0) return `+${pull.dust} paillettes`
  if (pull.stackCount !== null) return `doublon ×${pull.stackCount}`
  return 'doublon'
}

/** The pull's card title when the viewer may see it. */
export function pullTitle(pull: BoosterHistoryPull): string {
  if (pull.card === null) return 'Carte retirée'
  if (pull.card.kind === 'owned') return `« ${pull.card.title} »`
  return `Carte n°${pull.card.number}`
}
