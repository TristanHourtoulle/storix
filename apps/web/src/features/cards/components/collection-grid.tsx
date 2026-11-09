import { useEffect, useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useWindowVirtualizer } from '@tanstack/react-virtual'
import {
  buildCollectionRows,
  discoveryGroupOf,
  type CollectionCard,
  type DiscoveryGroup,
} from '@storix/shared'
import { Button } from '@/components/ui/button'
import { playSound } from '@/features/sound/sound'
import { DISCOVERY_GROUP_LABELS } from '../collection-sort-labels'
import { TIER_LABELS } from '../tier-labels'
import { useGridMetrics } from '../use-grid-metrics'
import { CollectionCardView } from './collection-card-view'

interface CollectionGridProps {
  leagueId: string
  cards: CollectionCard[]
  isGrouped: boolean
  newIds: ReadonlySet<string>
  onOpenCard: (card: CollectionCard) => void
  hasNextPage: boolean
  isFetchingNextPage: boolean
  isFetchNextPageError: boolean
  fetchNextPage: () => unknown
}

const COLUMNS = 3
const GAP = 12
const GROUP_HEADER_HEIGHT = 32
const CARD_SIZES = '(max-width: 480px) 31vw, 140px'

function cardLabel(card: CollectionCard, isNew: boolean): string {
  const suffix = isNew ? ', nouvelle' : ''
  if (card.kind === 'owned') {
    const star = card.isPromoted ? ' ★' : ''
    const stack = card.stackCount > 0 ? `, ×${card.stackCount} en pile` : ''
    return `${card.title}, ${TIER_LABELS[card.displayTier]}${star}${stack}${suffix}`
  }
  if (card.kind === 'hidden') return `Carte masquée${suffix}`
  return `Carte à découvrir, ${TIER_LABELS[card.tier]}${suffix}`
}

function playLocked(): void {
  playSound({ name: 'locked' })
}

function groupAt(now: number): (card: CollectionCard) => DiscoveryGroup {
  return (card) =>
    card.kind === 'locked' || card.discoveredAt === null
      ? 'undiscovered'
      : discoveryGroupOf(Date.parse(card.discoveredAt), now)
}

export function CollectionGrid({
  leagueId,
  cards,
  isGrouped,
  newIds,
  onOpenCard,
  hasNextPage,
  isFetchingNextPage,
  isFetchNextPageError,
  fetchNextPage,
}: CollectionGridProps) {
  const { containerRef, width, offsetTop } = useGridMetrics()
  const cardWidth = Math.max(0, (width - GAP * (COLUMNS - 1)) / COLUMNS)
  const cardHeight = (cardWidth * 88) / 63
  const [now] = useState(() => Date.now())
  const rows = useMemo(
    () => buildCollectionRows(cards, COLUMNS, isGrouped ? groupAt(now) : null),
    [cards, isGrouped, now],
  )
  const firstItemsIndex = rows.findIndex((row) => row.kind === 'items')

  const virtualizer = useWindowVirtualizer({
    count: width > 0 ? rows.length : 0,
    estimateSize: (index) =>
      rows[index]?.kind === 'header' ? GROUP_HEADER_HEIGHT : cardHeight + GAP,
    getItemKey: (index) => rows[index]?.key ?? index,
    overscan: 3,
    scrollMargin: offsetTop,
  })
  const { measure } = virtualizer
  useEffect(() => {
    measure()
  }, [cardHeight, rows, measure])
  const items = virtualizer.getVirtualItems()
  const lastIndex = items.at(-1)?.index ?? -1

  useEffect(() => {
    if (
      lastIndex >= rows.length - 2 &&
      hasNextPage &&
      !isFetchingNextPage &&
      !isFetchNextPageError
    ) {
      void fetchNextPage()
    }
  }, [lastIndex, rows.length, hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage])

  return (
    <>
      <div ref={containerRef} className="relative" style={{ height: virtualizer.getTotalSize() }}>
        {items.map((virtualRow) => {
          const row = rows[virtualRow.index]
          if (!row) return null
          const translate = `translateY(${virtualRow.start - virtualizer.options.scrollMargin}px)`
          if (row.kind === 'header') {
            return (
              <div
                key={virtualRow.key}
                role="heading"
                aria-level={2}
                className={`grid-group absolute top-0 left-0 w-full ${row.group === 'undiscovered' ? 'is-locked' : ''}`}
                style={{ height: GROUP_HEADER_HEIGHT - 8, transform: translate }}
              >
                {DISCOVERY_GROUP_LABELS[row.group]}
              </div>
            )
          }
          return (
            <div
              key={virtualRow.key}
              className="absolute top-0 left-0 grid w-full"
              style={{
                height: cardHeight,
                gap: GAP,
                gridTemplateColumns: `repeat(${COLUMNS}, minmax(0, 1fr))`,
                transform: translate,
              }}
            >
              {row.items.map((card) => {
                const isNew = newIds.has(card.id)
                return (
                  <Link
                    key={card.id}
                    to="/l/$leagueId/cards/$cardId"
                    params={{ leagueId, cardId: card.id }}
                    aria-label={cardLabel(card, isNew)}
                    className="relative block"
                    onClick={() => {
                      onOpenCard(card)
                      if (card.kind === 'locked') playLocked()
                    }}
                  >
                    <CollectionCardView
                      card={card}
                      size="md"
                      sizes={CARD_SIZES}
                      isEager={virtualRow.index === firstItemsIndex}
                    />
                    {isNew ? (
                      <span aria-hidden="true" className="new-badge">
                        NEW
                      </span>
                    ) : null}
                  </Link>
                )
              })}
            </div>
          )
        })}
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
