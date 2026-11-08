import { UNLIMITED_BATCH_SIZE, type DraftOverflow } from './use-photo-drafts'

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
