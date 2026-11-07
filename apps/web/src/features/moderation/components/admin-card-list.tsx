import type { AdminCard } from '@storix/shared'
import { Button } from '@/components/ui/button'
import { Chip } from '@/components/ui/chip'
import { CardFace } from '@/features/cards/components/card-face'
import { CardImage } from '@/features/cards/components/card-image'
import { TIER_LABELS } from '@/features/cards/tier-labels'
import type { AdminFilter } from '../moderation.types'

const FILTERS: readonly { id: AdminFilter; label: string }[] = [
  { id: 'all', label: 'Toutes' },
  { id: 'active', label: 'Actives' },
  { id: 'hidden', label: 'Masquées' },
  { id: 'provisional', label: 'Hors boosters' },
  { id: 'mythic', label: 'Mythiques' },
]

const TILE_SIZES = '(max-width: 480px) 31vw, 140px'

interface AdminCardListProps {
  cards: AdminCard[]
  outOfBoosterIds: ReadonlySet<string>
  filter: AdminFilter
  onFilterChange: (filter: AdminFilter) => void
  onSelect: (cardId: string) => void
  onLoadMore: () => void
  hasMore: boolean
  isLoadingMore: boolean
}

export function AdminCardList({
  cards,
  outOfBoosterIds,
  filter,
  onFilterChange,
  onSelect,
  onLoadMore,
  hasMore,
  isLoadingMore,
}: AdminCardListProps) {
  return (
    <div className="flex flex-col gap-3">
      <div
        role="group"
        aria-label="Filtrer les cartes"
        className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none]"
      >
        {FILTERS.map(({ id, label }) => (
          <Chip key={id} label={label} isOn={filter === id} onToggle={() => onFilterChange(id)} />
        ))}
      </div>
      {cards.length === 0 ? (
        <p className="m-0 text-sm text-muted">Aucune carte.</p>
      ) : (
        <div className="admin-grid">
          {cards.map((card) => (
            <button
              key={card.id}
              type="button"
              aria-label={`${card.title}, ${TIER_LABELS[card.tier]}`}
              className={`admin-tile${card.status === 'hidden' ? ' is-hidden' : ''}`}
              onClick={() => onSelect(card.id)}
            >
              <CardFace
                size="sm"
                title={card.title}
                tier={card.tier}
                isProvisional={outOfBoosterIds.has(card.id)}
              >
                <CardImage
                  image={card.image}
                  thumbhash={card.thumbhash}
                  width={card.width}
                  height={card.height}
                  sizes={TILE_SIZES}
                />
              </CardFace>
              <span className="admin-tile-pills">
                {card.status === 'hidden' ? <span className="pill tile">Masquée</span> : null}
                {card.pinnedTier === 'mythic' ? (
                  <span className="pill tile rainbow">Mythique</span>
                ) : null}
                {outOfBoosterIds.has(card.id) ? (
                  <span className="pill tile">Hors boosters</span>
                ) : null}
              </span>
            </button>
          ))}
        </div>
      )}
      {hasMore ? (
        <Button variant="ghost" onClick={onLoadMore} isLoading={isLoadingMore}>
          Charger plus
        </Button>
      ) : null}
    </div>
  )
}
