import { tierRank, type BoosterPull } from '@storix/shared'
import { authorLabel } from '@/features/cards/author-label'

/** Short outcome label of a pull: the stack it joined and the dust it gave, or the "new" badge. */
export function pullLabel(pull: BoosterPull): string {
  if (pull.isFirstCopy) return pull.isDiscovery ? 'Nouvelle · Découverte par toi' : 'Nouvelle'
  if (pull.outcome === 'new') return pull.variant === 'foil' ? 'Nouvelle foil' : 'Nouvelle'
  const dust = pull.dust > 0 ? `+${pull.dust} paillettes` : null
  const stack = pull.stackCount !== null ? `pile ×${pull.stackCount}` : null
  const gain = [dust, stack].filter((part) => part !== null).join(' · ')
  return pull.outcome === 'upgraded' ? `Améliorée · ${gain}` : gain
}

const MONTH_FORMAT = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' })

/** Credit line of a pulled card: its author and, when known, the month it was taken. */
export function pullCredit(pull: BoosterPull): string {
  const author = authorLabel(pull.card.author)
  const value = pull.card.capturedAt
  const date = value ? new Date(value) : null
  if (!date || Number.isNaN(date.getTime())) return `Photo de ${author}`
  return `Photo de ${author} · ${MONTH_FORMAT.format(date)}`
}

/** Index of the highest-tier pull, the first one on a tie. */
export function bestPullIndex(pulls: readonly BoosterPull[]): number {
  return pulls.reduce((best, pull, index) => {
    const current = pulls[best]
    return current && tierRank(pull.card.tier) > tierRank(current.card.tier) ? index : best
  }, 0)
}
