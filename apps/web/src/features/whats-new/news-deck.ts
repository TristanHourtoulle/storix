import {
  buildNewsPack,
  type CardTier,
  type NewsIllustration,
  type NewsTryTarget,
  type ReleaseNote,
} from '@storix/shared'

export const NEWS_MAX_CARDS = 8

export interface NewsCard {
  key: string
  title: string
  body: string
  tier: CardTier
  illustration: NewsIllustration | 'more'
  tryTarget: NewsTryTarget
}

export interface NewsDeck {
  releaseId: string
  publishedAt: string
  cards: readonly NewsCard[]
  featureCount: number
}

/**
 * Builds the booster deck shown for the given releases (newest first): at most
 * `NEWS_MAX_CARDS` feature cards, then an "Et aussi…" card listing the older titles.
 */
export function newsDeckOf(releases: readonly ReleaseNote[]): NewsDeck | null {
  const pack = buildNewsPack(releases, {
    maxCards: NEWS_MAX_CARDS,
    titleOf: (card) => card.title,
  })
  if (pack === null) return null
  const more: NewsCard[] =
    pack.overflowTitles.length > 0
      ? [
          {
            key: 'more',
            title: 'Et aussi…',
            body: pack.overflowTitles.join(' · '),
            tier: 'common',
            illustration: 'more',
            tryTarget: 'none',
          },
        ]
      : []
  return {
    releaseId: pack.newestId,
    publishedAt: pack.newestPublishedAt,
    cards: [...pack.cards, ...more],
    featureCount: pack.cards.length + pack.overflowTitles.length,
  }
}

/** Counts features in French, e.g. "1 nouveauté" or "5 nouveautés". */
export function featureCountLabel(count: number): string {
  return count > 1 ? `${count} nouveautés` : '1 nouveauté'
}
