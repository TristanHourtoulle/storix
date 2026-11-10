const DAY_FORMAT = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'short',
  timeZone: 'Europe/Paris',
})

/** Formats a release date as a short French day, e.g. "9 nov.". */
export function formatReleaseDay(publishedAt: string): string {
  return DAY_FORMAT.format(new Date(publishedAt))
}

/** Formats the pack label, e.g. "Mise à jour · 9 nov.". */
export function formatReleaseLabel(publishedAt: string): string {
  return `Mise à jour · ${formatReleaseDay(publishedAt)}`
}
