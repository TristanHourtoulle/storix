import type { CSSProperties } from 'react'
import type { CardProgression, CardTier, OwnedCardDetail } from '@storix/shared'
import { TIER_COLOR_VAR, TIER_LABELS } from './tier-labels'

type StepProgression = Exclude<CardProgression, { kind: 'max' }>

/** Formats a count with its French singular or plural noun. */
export function countLabel(count: number, singular: string, plural: string): string {
  return `${count} ${count > 1 ? plural : singular}`
}

function copiesPart(missingCopies: number): string | null {
  return missingCopies > 0 ? countLabel(missingCopies, 'doublon', 'doublons') : null
}

function joinParts(parts: readonly (string | null)[]): string {
  return parts.filter((part): part is string => part !== null).join(' · ')
}

/** Returns the label of the progression bar's main button. */
export function progressionButtonLabel(progression: CardProgression): string {
  switch (progression.kind) {
    case 'max':
      return progression.stackCount > 0
        ? `Rareté max · convertir ×${progression.stackCount}`
        : 'Rareté maximale'
    case 'ready':
      return `Passer ${TIER_LABELS[progression.to]} ★ · ${progression.cost}`
    case 'missing':
      return `Encore ${joinParts([
        copiesPart(progression.missingCopies),
        progression.labelDust !== null ? `${progression.labelDust} ✦` : null,
      ])}`
    case 'loading':
      return progression.missingCopies > 0
        ? `Encore ${countLabel(progression.missingCopies, 'doublon', 'doublons')}`
        : 'Chargement…'
  }
}

/** Returns the upgrade sheet's missing line, without the « Encore » prefix. */
export function missingSummary(progression: StepProgression): string | null {
  switch (progression.kind) {
    case 'ready':
      return `Tout est prêt pour passer ${TIER_LABELS[progression.to]} ★`
    case 'missing':
      return joinParts([
        copiesPart(progression.missingCopies),
        progression.missingDust > 0
          ? countLabel(progression.missingDust, 'paillette', 'paillettes')
          : null,
      ])
    case 'loading':
      return copiesPart(progression.missingCopies)
  }
}

/** Returns the class and colour variable for elements tinted with the next tier. */
export function nextTierTone(to: CardTier | null): {
  className: string
  style: CSSProperties | undefined
} {
  if (to === null || to === 'mythic') return { className: 'is-rainbow', style: undefined }
  return { className: '', style: { '--nc': TIER_COLOR_VAR[to] } as CSSProperties }
}

/** Returns the line shown under « Rareté maximale ». */
export function maxedLine(stackCount: number, convertAllDust: number): string {
  if (stackCount === 0) return 'Plus rien à améliorer sur cette carte.'
  if (stackCount === 1) return `Ton doublon vaut ${convertAllDust} paillettes.`
  return `Tes ${stackCount} doublons valent ${convertAllDust} paillettes.`
}

/** Returns why the foil upgrade is blocked, or null when it can be confirmed. */
export function foilBlockReason(
  foil: OwnedCardDetail['actions']['foilUpgrade'],
  dust: number | null,
): string | null {
  if (foil.reason === 'foil_owned') return 'Tu as déjà la foil'
  if (foil.reason === 'no_normal') return "Tu n'as pas d'exemplaire normal"
  const isShort = foil.reason === 'insufficient_dust' || (dust !== null && dust < foil.cost)
  if (!isShort) return null
  return dust === null
    ? 'Il te manque des paillettes'
    : `Il te manque ${foil.cost - dust} paillettes`
}
