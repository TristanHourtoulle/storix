export interface RarityWeights {
  uploaderScarcity: number
  photoAge: number
  reactions: number
}

export interface RaritySignals {
  uploaderScarcity: number
  photoAge: number
  reactions: number
}

export const DEFAULT_RARITY_WEIGHTS: RarityWeights = {
  uploaderScarcity: 1,
  photoAge: 1,
  reactions: 1,
}

export const NEUTRAL_SIGNAL = 0.5

export const PHOTO_AGE_UNVALIDATED_CAP = 0.5

export const REACTION_PRIOR_WEIGHT = 3

const MS_PER_YEAR = 365.25 * 86_400_000

/** Returns the zero-based mid-rank of each value divided by `n - 1`; a single value ranks 0.5. */
export function percentileRanks(values: readonly number[]): number[] {
  const n = values.length
  if (n === 0) return []
  if (n === 1) return [NEUTRAL_SIGNAL]
  return values.map((value) => {
    const below = values.filter((other) => other < value).length
    const equal = values.filter((other) => other === value).length
    return (below + (equal - 1) / 2) / (n - 1)
  })
}

/** Ranks each card by how few cards share its author; null authors form one group. */
export function scarcitySignals(authorIds: readonly (string | null)[]): number[] {
  const n = authorIds.length
  if (n === 0) return []
  if (n === 1) return [NEUTRAL_SIGNAL]
  const authorCounts = new Map<string | null, number>()
  for (const id of authorIds) authorCounts.set(id, (authorCounts.get(id) ?? 0) + 1)
  const cardsByCount = new Map<number, number>()
  for (const count of authorCounts.values()) {
    cardsByCount.set(count, (cardsByCount.get(count) ?? 0) + count)
  }
  const rankByCount = new Map<number, number>()
  let below = 0
  for (const count of [...cardsByCount.keys()].toSorted((x, y) => y - x)) {
    const equal = cardsByCount.get(count) ?? 0
    rankByCount.set(count, (below + (equal - 1) / 2) / (n - 1))
    below += equal
  }
  return authorIds.map((id) => rankByCount.get(authorCounts.get(id) ?? 0) ?? NEUTRAL_SIGNAL)
}

/** Ranks photo age among dated photos; undated is neutral, unvalidated dates are capped. */
export function photoAgeSignals(
  photos: readonly { capturedAt: Date | null; isValidated: boolean }[],
  now: Date,
): number[] {
  const dated = photos.flatMap((photo, index) =>
    photo.capturedAt === null
      ? []
      : [
          {
            index,
            age: Math.log1p(
              Math.max(0, (now.getTime() - photo.capturedAt.getTime()) / MS_PER_YEAR),
            ),
          },
        ],
  )
  const ranks = percentileRanks(dated.map((entry) => entry.age))
  const rankByIndex = new Map(dated.map((entry, i) => [entry.index, ranks[i] ?? NEUTRAL_SIGNAL]))
  return photos.map((photo, index) => {
    const rank = rankByIndex.get(index)
    if (rank === undefined) return NEUTRAL_SIGNAL
    return photo.isValidated ? rank : Math.min(rank, PHOTO_AGE_UNVALIDATED_CAP)
  })
}

/** Ranks the Bayesian average of reactions, shrunk toward the league mean. */
export function reactionSignals(
  cards: readonly { reactors: number; reactionSum: number }[],
): number[] {
  const totalReactors = cards.reduce((sum, card) => sum + card.reactors, 0)
  const totalSum = cards.reduce((sum, card) => sum + card.reactionSum, 0)
  const mean = totalReactors === 0 ? 0 : totalSum / totalReactors
  return percentileRanks(
    cards.map(
      (card) =>
        (REACTION_PRIOR_WEIGHT * mean + card.reactionSum) / (REACTION_PRIOR_WEIGHT + card.reactors),
    ),
  )
}

/** Returns the weighted mean of the signals, or the neutral signal when all weights are zero. */
export function rarityScore(signals: RaritySignals, weights: RarityWeights): number {
  const totalWeight = weights.uploaderScarcity + weights.photoAge + weights.reactions
  if (totalWeight === 0) return NEUTRAL_SIGNAL
  return (
    (weights.uploaderScarcity * signals.uploaderScarcity +
      weights.photoAge * signals.photoAge +
      weights.reactions * signals.reactions) /
    totalWeight
  )
}
