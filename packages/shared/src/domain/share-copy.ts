import { tierRank, type CardTier } from './cards'

export interface ShareCardFacts {
  title: string
  tier: CardTier
  tierLabel: string
  isFoil: boolean
}

export interface BoosterShareOrigin {
  kind: 'booster'
  isFirstCopy: boolean
  isDiscovery: boolean
  position: number
  total: number
  isBest: boolean
  openedAt: string
}

export interface CollectionShareOrigin {
  kind: 'collection'
  isDiscoveredByMe: boolean
}

export type ShareOrigin = BoosterShareOrigin | CollectionShareOrigin

export interface ShareBadge {
  label: string
  tone: 'new' | 'foil'
}

const SLUG_MAX_LENGTH = 40
const BOOSTER_DATE = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' })

function isEpicOrAbove(tier: CardTier): boolean {
  return tierRank(tier) >= tierRank('epic')
}

/** Returns the headline of a Flex share image. */
export function shareBanner(card: ShareCardFacts, origin: ShareOrigin): string {
  if (origin.kind === 'booster') {
    if (isEpicOrAbove(card.tier)) return `Tirée en ${card.tierLabel} !`
    if (card.isFoil) return 'Tirée en foil !'
    if (origin.isDiscovery || origin.isFirstCopy) return 'Nouvelle découverte !'
    return 'Tirée dans mon booster'
  }
  if (isEpicOrAbove(card.tier)) return `Ma carte ${card.tierLabel} !`
  if (card.isFoil) return 'Ma carte foil !'
  if (origin.isDiscoveredByMe) return 'Découverte par moi !'
  return 'Dans ma collection'
}

function newBadge(origin: ShareOrigin): ShareBadge | null {
  if (origin.kind === 'collection') {
    return origin.isDiscoveredByMe ? { label: 'Découverte par moi', tone: 'new' } : null
  }
  if (origin.isDiscovery) return { label: 'Découverte par moi', tone: 'new' }
  if (origin.isFirstCopy) return { label: 'Nouvelle', tone: 'new' }
  return null
}

/** Lists the badges drawn under the card of a Flex share image. */
export function shareBadges(card: ShareCardFacts, origin: ShareOrigin): readonly ShareBadge[] {
  const discovery = newBadge(origin)
  const foil: ShareBadge | null = card.isFoil ? { label: 'Foil', tone: 'foil' } : null
  return [discovery, foil].filter((badge): badge is ShareBadge => badge !== null)
}

/** Writes the « Booster du 9 nov. · … » line of a booster share image. */
export function boosterContextLine(origin: BoosterShareOrigin): string {
  const head = `Booster du ${BOOSTER_DATE.format(new Date(origin.openedAt))}`
  if (origin.total <= 1) return head
  if (origin.isBest) return `${head} · meilleure prise sur ${origin.total}`
  return `${head} · carte ${origin.position} sur ${origin.total}`
}

/** Writes the sub line of the whole-pack share image. */
export function packSubline(total: number, bestTierLabel: string): string {
  const count = total === 1 ? '1 carte' : `${total} cartes`
  return `${count} · meilleure prise en ${bestTierLabel}`
}

/** Writes the message sent along with a share image. */
export function shareText(card: ShareCardFacts, origin: ShareOrigin): string {
  if (origin.kind === 'booster')
    return `J'ai tiré « ${card.title} » en ${card.tierLabel} sur Storix !`
  return `Regarde ma carte « ${card.title} » en ${card.tierLabel} sur Storix !`
}

function trimDashes(value: string): string {
  return value.replace(/^-+|-+$/g, '')
}

/** Builds the `storix-<slug>.png` file name of a share image. */
export function shareFileName(title: string): string {
  const slug = trimDashes(
    trimDashes(
      title
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-'),
    ).slice(0, SLUG_MAX_LENGTH),
  )
  return `storix-${slug === '' ? 'carte' : slug}.png`
}
