import type { ShotChip, ShotHeadline } from '@storix/shared/domain'
import { UNLIMITED_BATCH_SIZE, type DraftOverflow } from './draft-capacity'

/** `"{count} {singular|plural}"`, French style: 0 and 1 take the singular. */
export function plural(count: number, singular: string, pluralForm: string): string {
  return `${count} ${count > 1 ? pluralForm : singular}`
}

/** The notice shown when picked photos did not fit the batch or the daily quota. */
export function overflowMessage({ kind, skipped, accepted }: DraftOverflow): string {
  const ignored = `${plural(skipped, "photo n'a", "photos n'ont")} pas été ajoutée${skipped > 1 ? 's' : ''}`
  if (kind === 'batch') return `${UNLIMITED_BATCH_SIZE} photos max par envoi : ${ignored}.`
  return accepted === 0
    ? `Limite du jour atteinte : ${ignored}.`
    : `Il ne te restait ${accepted === 1 ? "qu'une photo" : `que ${accepted} photos`} aujourd'hui, ${ignored}.`
}

const SHOT_HEADLINES: Record<ShotHeadline, string> = {
  first: 'Ta première carte se prend ici',
  quotaFull: 'Limite atteinte pour 24 h',
  batchFull: '30 photos max par envoi',
  default: 'Cadre comme une carte',
}

/** The camera screen quota chip: "{n} places" for a member, "{left} / 30 max" for an admin. */
export function shotChipLabel(chip: ShotChip): string {
  return chip.kind === 'places'
    ? plural(chip.left, 'place', 'places')
    : `${chip.left} / ${chip.max} max`
}

/** The camera screen headline. */
export function shotHeadline(headline: ShotHeadline): string {
  return SHOT_HEADLINES[headline]
}

/** The camera screen line under the headline. */
export function shotBody(headline: ShotHeadline, hasDrafts: boolean): string {
  if (headline !== 'quotaFull') {
    return "Le déclencheur ouvre l'appareil photo. Tu recadres ensuite dans la pile."
  }
  return `Des places se libèrent au fil des 24 h.${hasDrafts ? ' Ton brouillon reste publiable.' : ''}`
}

/** "Continuer avec {n} photos", or "Continuer" when nothing is in the strip. */
export function continueLabel(count: number): string {
  return count === 0 ? 'Continuer' : `Continuer avec ${plural(count, 'photo', 'photos')}`
}
