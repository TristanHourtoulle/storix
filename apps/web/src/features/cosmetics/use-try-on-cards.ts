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
  isLoading: boolean
}

function sampleFaces(cards: readonly CollectionCard[], count: number): TryOnFace[] {
  const covered = new Set(cards.map((card) => card.tier))
  const tiers = [
    ...CARD_TIERS.filter((tier) => !covered.has(tier)),
    ...CARD_TIERS.filter((tier) => covered.has(tier)),
  ]
  return tiers.slice(0, count).map((tier) => ({ kind: 'sample', key: `sample-${tier}`, tier }))
}

function tierRank(face: TryOnFace): number {
  const tier = face.kind === 'card' ? face.card.tier : face.tier
  return CARD_TIERS.indexOf(tier)
}

/** Six faces for the try-on cabin: the viewer's own cards first, completed with sample faces. */
export function useTryOnCards(leagueId: string): TryOnCards {
  const { data, isPending } = useQuery(tryOnCardsQueryOptions(leagueId))
  const cards = data?.cards ?? []
  const own: TryOnFace[] = cards.map((card) => ({ kind: 'card', key: card.id, card }))
  const faces = [...own, ...sampleFaces(cards, TRY_ON_CARDS_MAX - own.length)].toSorted(
    (a, b) => tierRank(a) - tierRank(b),
  )
  const source: TryOnSource =
    own.length === 0 ? 'samples' : own.length < TRY_ON_CARDS_MAX ? 'mixed' : 'collection'
  return { faces, source, isLoading: isPending }
}
