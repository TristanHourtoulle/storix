import type { BoosterPull } from '@storix/shared'
import { authorLabel } from '@/features/cards/author-label'

/** Short outcome label of a pull: the stack it joined, the dust of an older opening, or the "new" badge. */
export function pullLabel(pull: BoosterPull): string {
  if (pull.isFirstCopy) return pull.isDiscovery ? 'Nouvelle · Découverte par toi' : 'Nouvelle'
  if (pull.outcome === 'new') return pull.variant === 'foil' ? 'Nouvelle foil' : 'Nouvelle'
  const gain =
    pull.stackCount !== null ? `+1 dans ta pile (×${pull.stackCount})` : `+${pull.dust} paillettes`
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
