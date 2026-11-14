import type { CharmId } from '@storix/shared'

export interface OddsLine {
  label: string
  before: string | null
  after: string
}

export interface CharmCopy {
  short: string
  effect: string
  named: string
  thanks: string
  color: string
  standardOdds: readonly OddsLine[]
  premiumOdds: readonly OddsLine[]
  isMythicBound: boolean
}

const COLLECTION_LINE = (label: string): OddsLine => ({
  label,
  before: null,
  after: '1 chance sur 4',
})

export const CHARM_COPY: Readonly<Record<CharmId, CharmCopy>> = {
  trefle: {
    short: 'Mythique et Légendaire +25 %',
    effect: 'Légendaire 7 → 8,75 %, Mythique 1 → 1,25 % (premium : Mythique 15 → 18,75 %)',
    named: 'le Trèfle',
    thanks: 'au Trèfle',
    color: 'var(--color-tier-uncommon)',
    standardOdds: [
      { label: 'Mythique', before: '1 %', after: '1,25 %' },
      { label: 'Légendaire', before: '7 %', after: '8,75 %' },
    ],
    premiumOdds: [{ label: 'Mythique', before: '15 %', after: '18,75 %' }],
    isMythicBound: true,
  },
  'trefle-or': {
    short: 'Mythique ×2',
    effect: 'Mythique 1 → 2 %, Légendaire 7 → 9 % (premium : Mythique 15 → 25 %)',
    named: "le Trèfle d'or",
    thanks: "au Trèfle d'or",
    color: 'var(--color-tier-legendary)',
    standardOdds: [
      { label: 'Mythique', before: '1 %', after: '2 %' },
      { label: 'Légendaire', before: '7 %', after: '9 %' },
    ],
    premiumOdds: [{ label: 'Mythique', before: '15 %', after: '25 %' }],
    isMythicBound: true,
  },
  boussole: {
    short: 'Nouvelle carte +25 %',
    effect: "25 % de chances par carte de piocher une carte que tu n'as pas, même rareté",
    named: 'la Boussole',
    thanks: 'à la Boussole',
    color: 'var(--color-tier-rare)',
    standardOdds: [COLLECTION_LINE("Carte que tu n'as pas")],
    premiumOdds: [COLLECTION_LINE("Carte que tu n'as pas")],
    isMythicBound: false,
  },
  aimant: {
    short: 'Doublon +25 %',
    effect:
      '25 % de chances par carte de piocher une carte que tu as déjà : plus de paillettes et de piles',
    named: "l'Aimant",
    thanks: "à l'Aimant",
    color: 'var(--color-danger)',
    standardOdds: [COLLECTION_LINE('Carte que tu as déjà')],
    premiumOdds: [COLLECTION_LINE('Carte que tu as déjà')],
    isMythicBound: false,
  },
  eclat: {
    short: 'Brillante +25 %',
    effect: 'Brillante 1 sur 15 → 1 sur 12 par carte',
    named: "l'Éclat",
    thanks: "à l'Éclat",
    color: 'var(--color-cyan-soft)',
    standardOdds: [{ label: 'Brillante', before: '1 sur 15', after: '1 sur 12' }],
    premiumOdds: [{ label: 'Brillante', before: '1 sur 15', after: '1 sur 12' }],
    isMythicBound: false,
  },
  tamis: {
    short: 'Paillettes +25 %',
    effect: 'Paillettes des doublons ×1,25',
    named: 'le Tamis',
    thanks: 'au Tamis',
    color: 'var(--color-tier-legendary)',
    standardOdds: [{ label: 'Paillettes des doublons', before: '×1', after: '×1,25' }],
    premiumOdds: [{ label: 'Paillettes des doublons', before: '×1', after: '×1,25' }],
    isMythicBound: false,
  },
}

export const MYTHIC_ABSENT_NOTE =
  'Pas encore de Mythique dans la ligue : la chance va aux Légendaires'

/** "7 boosters restants", singular aware. */
export function chargesLeftLabel(charges: number): string {
  return charges > 1 ? `${charges} boosters restants` : `${charges} booster restant`
}

/** "Le Trèfle", "La Boussole": a charm's article and name at the start of a sentence. */
export function capitalizedName(named: string): string {
  return `${named.charAt(0).toUpperCase()}${named.slice(1)}`
}
