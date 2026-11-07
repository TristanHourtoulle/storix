import type { RecentReveal } from '@storix/shared'
import { CardFace } from '@/features/cards/components/card-face'
import { CardImage } from '@/features/cards/components/card-image'
import { useThumbhashUrl } from '@/features/cards/use-thumbhash-url'

interface RecentRevealsProps {
  reveals: RecentReveal[]
}

const REVEAL_SIZES = '108px'

function LockedArt({ thumbhash }: { thumbhash: string }) {
  const placeholder = useThumbhashUrl(thumbhash)
  return (
    <div
      className="absolute inset-0 bg-surface-2 bg-cover bg-center blur-[2px]"
      style={placeholder ? { backgroundImage: `url(${placeholder})` } : undefined}
    />
  )
}

function RevealCard({ card }: { card: RecentReveal['card'] }) {
  if (card.kind === 'locked') {
    return (
      <CardFace size="md" title="???" tier={card.tier} isProvisional={card.isProvisional}>
        <LockedArt thumbhash={card.thumbhash} />
      </CardFace>
    )
  }
  return (
    <CardFace
      size="md"
      title={card.title}
      tier={card.displayTier}
      isProvisional={card.isProvisional}
    >
      <CardImage
        image={card.image}
        thumbhash={card.thumbhash}
        width={card.width}
        height={card.height}
        sizes={REVEAL_SIZES}
      />
    </CardFace>
  )
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
