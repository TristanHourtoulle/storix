import type { BoosterPull, OwnedCardDetail, ShareCardFacts, ShareOrigin } from '@storix/shared'
import { bestPullIndex } from '@/features/boosters/pull-label'
import { largestSource } from '@/features/cards/image-source'
import { TIER_LABELS } from '@/features/cards/tier-labels'

export type ShareStyle = 'card' | 'flex' | 'pack'

export interface ShareCard {
  id: string
  number: number
  facts: ShareCardFacts
  photoUrl: string | null
}

export interface ShareSubject {
  leagueName: string
  card: ShareCard
  origin: ShareOrigin
  pack: readonly ShareCard[] | null
}

function cardFromPull(pull: BoosterPull): ShareCard {
  const { card } = pull
  return {
    id: card.id,
    number: card.number,
    facts: {
      title: card.title,
      tier: card.tier,
      tierLabel: TIER_LABELS[card.tier],
      isFoil: pull.variant === 'foil',
    },
    photoUrl: largestSource(card.image.webp)?.url ?? null,
  }
}

/** Builds what a recap card shares: the pulled card, its booster context and the whole pack (best first). */
export function subjectFromPulls(
  pulls: readonly BoosterPull[],
  index: number,
  openedAt: string,
  leagueName: string,
): ShareSubject {
  const pull = pulls[index]
  if (!pull) throw new RangeError(`No pull at index ${index}`)
  const best = bestPullIndex(pulls)
  const bestPull = pulls[best]
  const others = pulls.filter((_, position) => position !== best)
  return {
    leagueName,
    card: cardFromPull(pull),
    origin: {
      kind: 'booster',
      isFirstCopy: pull.isFirstCopy,
      isDiscovery: pull.isDiscovery,
      position: index + 1,
      total: pulls.length,
      isBest: index === best,
      openedAt,
    },
    pack: (bestPull ? [bestPull, ...others] : others).map(cardFromPull),
  }
}

/** Builds what an owned card page shares: the card at its personal rarity, without booster context. */
export function subjectFromCardDetail(
  card: OwnedCardDetail,
  meId: string,
  leagueName: string,
): ShareSubject {
  return {
    leagueName,
    card: {
      id: card.id,
      number: card.number,
      facts: {
        title: card.title,
        tier: card.displayTier,
        tierLabel: TIER_LABELS[card.displayTier],
        isFoil: card.copies.foil !== null,
      },
      photoUrl: largestSource(card.image.webp)?.url ?? null,
    },
    origin: { kind: 'collection', isDiscoveredByMe: card.discoveredBy?.userId === meId },
    pack: null,
  }
}

/** Lists the image styles a subject can be shared as; the whole pack needs at least two cards. */
export function availableStyles(subject: ShareSubject): readonly ShareStyle[] {
  return subject.pack !== null && subject.pack.length >= 2
    ? ['card', 'flex', 'pack']
    : ['card', 'flex']
}
