import { useQuery } from '@tanstack/react-query'
import { CARD_TIERS, TRY_ON_CARDS_MAX, type CardTier, type CollectionCard } from '@storix/shared'
import { tryOnCardsQueryOptions } from './cosmetics.queries'

export type TryOnFace =
  | { kind: 'card'; key: string; card: CollectionCard }
  | { kind: 'sample'; key: string; tier: CardTier }

export type TryOnSource = 'collection' | 'mixed' | 'samples'

interface TryOnCards {
  faces: TryOnFace[]
  source: TryOnSource
}

function shownTier(card: CollectionCard): CardTier {
  return card.kind === 'owned' ? card.displayTier : card.tier
}

/** One face per rarity for the try-on cabin: the viewer's own card of that rarity, or a sample face. */
export function useTryOnCards(leagueId: string): TryOnCards {
  const { data } = useQuery(tryOnCardsQueryOptions(leagueId))
  const cards = data?.cards ?? []
  const faces: TryOnFace[] = CARD_TIERS.slice(0, TRY_ON_CARDS_MAX).map((tier) => {
    const card = cards.find((candidate) => shownTier(candidate) === tier)
    return card === undefined
      ? { kind: 'sample', key: `sample-${tier}`, tier }
      : { kind: 'card', key: card.id, card }
  })
  const ownCount = faces.filter((face) => face.kind === 'card').length
  const source: TryOnSource =
    ownCount === 0 ? 'samples' : ownCount < faces.length ? 'mixed' : 'collection'
  return { faces, source }
}
