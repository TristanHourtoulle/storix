import type { TaggedCard } from '@storix/shared'
import { Button } from '@/components/ui/button'
import { authorLabel } from '@/features/cards/author-label'
import { formatCardNumber } from '@/features/cards/card-number'
import { CardFace } from '@/features/cards/components/card-face'
import { CardImage } from '@/features/cards/components/card-image'
import { TIER_LABELS } from '@/features/cards/tier-labels'

interface TaggedCardListProps {
  cards: TaggedCard[]
  onWithdraw: (card: TaggedCard) => void
}

export function TaggedCardList({ cards, onWithdraw }: TaggedCardListProps) {
  return (
    <ul className="m-0 flex list-none flex-col gap-3 p-0">
      {cards.map((card) => (
        <li
          key={card.id}
          className="flex items-center gap-4 rounded-panel bg-surface p-3 shadow-hairline"
        >
          <CardFace size="sm" title={card.title} tier={card.tier} isProvisional={false}>
            <CardImage
              image={card.image}
              thumbhash={card.thumbhash}
              width={card.width}
              height={card.height}
              sizes="120px"
            />
          </CardFace>
          <div className="flex min-w-0 flex-1 flex-col items-start gap-2">
            <p className="m-0 max-w-full truncate font-display font-semibold">{card.title}</p>
            <p className="m-0 text-sm text-muted">
              {formatCardNumber(card.number)} · {TIER_LABELS[card.tier]}
            </p>
            <p className="m-0 max-w-full truncate text-sm text-muted">
              Photo de {authorLabel(card.author)}
            </p>
            {card.status === 'hidden' ? <span className="pill">Masquée</span> : null}
            <Button
              variant="ghost"
              aria-label={`Retirer la carte ${formatCardNumber(card.number)}`}
              onClick={() => onWithdraw(card)}
            >
              Retirer
            </Button>
          </div>
        </li>
      ))}
    </ul>
  )
}
