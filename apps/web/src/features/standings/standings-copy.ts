import type { StandingThemeId } from '@storix/shared'

const NUMBER = new Intl.NumberFormat('fr-FR')

/** A count in French formatting (« 6 420 »). */
export function formatCount(value: number): string {
  return NUMBER.format(value)
}

/** French ordinal for a ranking position (« 1er », « 4e »). */
export function ordinal(position: number): string {
  return position === 1 ? '1er' : `${position}e`
}

/** Share of the league's active cards a member owns, in whole percent, never above 100. */
function leagueShare(value: number, leagueCardCount: number): number {
  if (leagueCardCount === 0) return 0
  return Math.min(100, Math.round((value / leagueCardCount) * 100))
}

/** The small line under a member's name in a theme's list. */
export function themeSubline(
  themeId: StandingThemeId,
  value: number,
  leagueCardCount: number,
): string {
  switch (themeId) {
    case 'collector':
      return `${leagueShare(value, leagueCardCount)} % de la ligue`
    case 'hunter':
      return 'score de rareté'
    case 'foil':
      return 'cartes brillantes'
    case 'photographer':
      return 'photos devenues cartes'
    case 'opener':
      return 'boosters ouverts'
    case 'fortune':
      return 'paillettes maintenant'
    case 'week':
      return 'nouvelles depuis lundi'
  }
}

/** « 7 membres », « 1 membre ». */
export function memberCountLabel(count: number): string {
  return `${count} ${count > 1 ? 'membres' : 'membre'}`
}

/** What the ranking says while nobody has scored yet in a theme. */
export function themeEmptyText(themeId: StandingThemeId): string {
  switch (themeId) {
    case 'collector':
      return 'Personne n’a encore de carte. Ouvre un booster pour prendre la tête.'
    case 'hunter':
      return 'Aucune carte rare pour l’instant : le premier tirage prend la tête.'
    case 'foil':
      return 'Aucune carte brillante pour l’instant.'
    case 'photographer':
      return 'Aucune photo n’est encore devenue carte.'
    case 'opener':
      return 'Personne n’a encore ouvert de booster.'
    case 'fortune':
      return 'Personne n’a de paillettes en poche pour l’instant.'
    case 'week':
      return 'Personne n’a encore de nouvelle carte cette semaine. Le classement repart chaque lundi.'
  }
}
