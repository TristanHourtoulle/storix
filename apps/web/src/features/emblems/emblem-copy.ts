import { emblemDefinition, tierRank, type EmblemProgressView } from '@storix/shared'

const DAY_FORMAT = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' })
const PARIS_DAY = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' })

function isToday(iso: string): boolean {
  return PARIS_DAY.format(new Date(iso)) === PARIS_DAY.format(new Date())
}

/** Short earned date for a grid tile: "auj." or "7 nov.". */
export function earnedShort(iso: string): string {
  return isToday(iso) ? 'auj.' : DAY_FORMAT.format(new Date(iso))
}

/** Earned date sentence for the emblem sheet. */
export function earnedSentence(iso: string): string {
  return isToday(iso) ? "Débloqué aujourd'hui" : `Débloqué le ${DAY_FORMAT.format(new Date(iso))}`
}

/** True when a locked emblem has no measurable progress yet, shown as "à venir". */
export function isUpcoming(emblem: EmblemProgressView): boolean {
  return !emblem.isEarned && emblem.progress === 0 && emblem.target === 1
}

/** Earned first (rarest, then most recent), then locked (easiest tier, then closest to done). */
export function orderEmblems(emblems: readonly EmblemProgressView[]): EmblemProgressView[] {
  const rank = (emblem: EmblemProgressView) => tierRank(emblemDefinition(emblem.id).tier)
  const earned = emblems
    .filter((emblem) => emblem.isEarned)
    .toSorted((a, b) => rank(b) - rank(a) || (b.earnedAt ?? '').localeCompare(a.earnedAt ?? ''))
  const locked = emblems
    .filter((emblem) => !emblem.isEarned)
    .toSorted((a, b) => rank(a) - rank(b) || b.progress / b.target - a.progress / a.target)
  return [...earned, ...locked]
}
