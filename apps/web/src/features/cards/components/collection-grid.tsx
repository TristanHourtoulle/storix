import { useEffect } from 'react'
import { useSuspenseInfiniteQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useWindowVirtualizer } from '@tanstack/react-virtual'
import { cardsInfiniteQueryOptions } from '../cards.queries'
import { useGridMetrics } from '../use-grid-metrics'
import { CardFace } from './card-face'
import { CardImage } from './card-image'

interface CollectionGridProps {
  leagueId: string
  authorId: string | null
}

const COLUMNS = 3
const GAP = 12
const CARD_SIZES = '(max-width: 480px) 31vw, 140px'

export function CollectionGrid({ leagueId, authorId }: CollectionGridProps) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useSuspenseInfiniteQuery(
    cardsInfiniteQueryOptions(leagueId, authorId),
  )
  const cards = data.pages.flatMap((page) => page.cards)
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
  const items = virtualizer.getVirtualItems()
  const lastIndex = items.at(-1)?.index ?? -1

  useEffect(() => {
    if (lastIndex >= rowCount - 2 && hasNextPage && !isFetchingNextPage) void fetchNextPage()
  }, [lastIndex, rowCount, hasNextPage, isFetchingNextPage, fetchNextPage])

  return (
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
              aria-label={card.title}
              className="block"
            >
              <CardFace
                size="md"
                title={card.title}
                tier={card.tier}
                isProvisional={card.isProvisional}
              >
                <CardImage
                  image={card.image}
                  thumbhash={card.thumbhash}
                  width={card.width}
                  height={card.height}
                  sizes={CARD_SIZES}
                  alt={card.title}
                  isEager={row.index === 0}
                />
              </CardFace>
            </Link>
          ))}
        </div>
      ))}
    </div>
  )
}
