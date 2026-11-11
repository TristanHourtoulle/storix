import type { ShotBlock, ShotChip } from '@storix/shared/domain'
import type { DraftOverflow } from './draft-capacity'

/** `"{count} {singular|plural}"`, French style: 0 and 1 take the singular. */
export function plural(count: number, singular: string, pluralForm: string): string {
  return `${count} ${count > 1 ? pluralForm : singular}`
}

/** The notice shown when picked photos did not fit the daily quota. */
export function overflowMessage({ skipped, accepted }: DraftOverflow): string {
  const ignored = `${plural(skipped, "photo n'a", "photos n'ont")} pas été ajoutée${skipped > 1 ? 's' : ''}`
  return accepted === 0
    ? `Limite du jour atteinte : ${ignored}.`
    : `Il ne te restait ${accepted === 1 ? "qu'une photo" : `que ${accepted} photos`} aujourd'hui, ${ignored}.`
}

/** The camera screen quota chip: "{n} places" for a member, "Illimité" for an admin. */
export function shotChipLabel(chip: ShotChip): string {
  return chip.kind === 'places' ? plural(chip.left, 'place', 'places') : 'Illimité'
}

/** The in-frame notice when no shot fits (V13), or null. */
export function shotBlockedNotice(
  block: ShotBlock | null,
  hasDrafts: boolean,
): { title: string; body: string } | null {
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
