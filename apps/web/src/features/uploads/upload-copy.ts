import type { ShotBlock, ShotChip } from '@storix/shared/domain'
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

/** The camera screen quota chip: "{n} places" for a member, "{left} / 30 max" for an admin. */
export function shotChipLabel(chip: ShotChip): string {
  return chip.kind === 'places'
    ? plural(chip.left, 'place', 'places')
    : `${chip.left} / ${chip.max} max`
}

/** The in-frame notice when no shot fits (V13), or null. */
export function shotBlockedNotice(
  block: ShotBlock | null,
  hasDrafts: boolean,
): { title: string; body: string } | null {
  if (block === 'batch') {
    return {
      title: `${UNLIMITED_BATCH_SIZE} photos max par envoi`,
      body: 'Envoie celles-ci, puis reviens pour la suite.',
    }
  }
  if (block === 'quota') {
    return {
      title: 'Limite atteinte pour 24 h',
      body: `Des places se libèrent au fil des 24 h.${hasDrafts ? ' Ton brouillon reste publiable.' : ''}`,
    }
  }
  return null
}

/** "Continuer avec {n} photos", or "Continuer" when nothing is in the strip. */
export function continueLabel(count: number): string {
  return count === 0 ? 'Continuer' : `Continuer avec ${plural(count, 'photo', 'photos')}`
}
