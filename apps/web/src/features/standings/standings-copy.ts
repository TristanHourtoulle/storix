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

/** The small line under a member's name in a theme's list. */
export function themeSubline(
  themeId: StandingThemeId,
  value: number,
  leagueCardCount: number,
): string {
  switch (themeId) {
    case 'collector':
      return `${leagueCardCount === 0 ? 0 : Math.round((value / leagueCardCount) * 100)} % de la ligue`
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
