import { useEffect } from 'react'
import { Link } from '@tanstack/react-router'
import { useWindowVirtualizer } from '@tanstack/react-virtual'
import type { CollectionCard } from '@storix/shared'
import { Button } from '@/components/ui/button'
import { playSound } from '@/features/sound/sound'
import { TIER_LABELS } from '../tier-labels'
import { useGridMetrics } from '../use-grid-metrics'
import { CollectionCardView } from './collection-card-view'

interface CollectionGridProps {
  leagueId: string
  cards: CollectionCard[]
  hasNextPage: boolean
  isFetchingNextPage: boolean
  isFetchNextPageError: boolean
  fetchNextPage: () => unknown
}

const COLUMNS = 3
const GAP = 12
const CARD_SIZES = '(max-width: 480px) 31vw, 140px'

function cardLabel(card: CollectionCard): string {
  if (card.kind === 'owned') return `${card.title}, ${TIER_LABELS[card.displayTier]}`
  if (card.kind === 'hidden') return 'Carte masquée'
  return `Carte à découvrir, ${TIER_LABELS[card.tier]}`
}

function playLocked(): void {
  playSound({ name: 'locked' })
}

export function CollectionGrid({
  leagueId,
  cards,
  hasNextPage,
  isFetchingNextPage,
  isFetchNextPageError,
  fetchNextPage,
}: CollectionGridProps) {
  const { containerRef, width, offsetTop } = useGridMetrics()
  const cardWidth = Math.max(0, (width - GAP * (COLUMNS - 1)) / COLUMNS)
  const cardHeight = (cardWidth * 88) / 63
  const rowCount = Math.ceil(cards.length / COLUMNS)

  const virtualizer = useWindowVirtualizer({
    count: width > 0 ? rowCount : 0,
    estimateSize: () => cardHeight + GAP,
    overscan: 3,
    scrollMargin: offsetTop,
  })
  const { measure } = virtualizer
  useEffect(() => {
    measure()
  }, [cardHeight, measure])
  const items = virtualizer.getVirtualItems()
  const lastIndex = items.at(-1)?.index ?? -1

  useEffect(() => {
    if (lastIndex >= rowCount - 2 && hasNextPage && !isFetchingNextPage && !isFetchNextPageError) {
      void fetchNextPage()
    }
  }, [lastIndex, rowCount, hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage])

  return (
    <>
      <div ref={containerRef} className="relative" style={{ height: virtualizer.getTotalSize() }}>
        {items.map((row) => (
          <div
            key={row.key}
            className="absolute top-0 left-0 grid w-full"
            style={{
              height: cardHeight,
              gap: GAP,
              gridTemplateColumns: `repeat(${COLUMNS}, minmax(0, 1fr))`,
              transform: `translateY(${row.start - virtualizer.options.scrollMargin}px)`,
            }}
          >
            {cards.slice(row.index * COLUMNS, row.index * COLUMNS + COLUMNS).map((card) => (
              <Link
                key={card.id}
                to="/l/$leagueId/cards/$cardId"
                params={{ leagueId, cardId: card.id }}
                aria-label={cardLabel(card)}
                className="block"
                onClick={card.kind === 'locked' ? playLocked : undefined}
              >
                <CollectionCardView
                  card={card}
                  size="md"
                  sizes={CARD_SIZES}
                  isEager={row.index === 0}
                />
              </Link>
            ))}
          </div>
        ))}
      </div>
      {isFetchNextPageError && hasNextPage ? (
        <section role="alert" className="flex flex-col items-center gap-3 text-center">
          <p className="m-0 text-sm text-muted">Impossible de charger la suite.</p>
          <Button
            variant="ghost"
            onClick={() => void fetchNextPage()}
            isLoading={isFetchingNextPage}
          >
            Réessayer
          </Button>
        </section>
      ) : null}
    </>
  )
}
