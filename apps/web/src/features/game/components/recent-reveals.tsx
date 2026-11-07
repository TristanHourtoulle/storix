import type { RecentReveal } from '@storix/shared'
import { CollectionCardView } from '@/features/cards/components/collection-card-view'

interface RecentRevealsProps {
  reveals: RecentReveal[]
}

const REVEAL_SIZES = '108px'

function RevealCard({ card }: { card: RecentReveal['card'] }) {
  return <CollectionCardView card={card} size="md" sizes={REVEAL_SIZES} />
}

export function RecentReveals({ reveals }: RecentRevealsProps) {
  if (reveals.length === 0) return null

  return (
    <section aria-labelledby="recent-reveals-title">
      <h2 id="recent-reveals-title" className="mb-3">
        Révélations récentes
      </h2>
      <ul className="cards-row">
        {reveals.map((reveal) => (
          <li key={`${reveal.card.id}-${reveal.variant}-${reveal.pulledAt}`} className="mini">
            <RevealCard card={reveal.card} />
            <p className="mini-by">
              tirée par {reveal.pulledBy.displayUsername ?? 'un ancien membre'}
            </p>
          </li>
        ))}
      </ul>
    </section>
  )
}
