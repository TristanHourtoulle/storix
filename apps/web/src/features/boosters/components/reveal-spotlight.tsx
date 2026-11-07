import { m } from 'motion/react'
import type { BoosterPull } from '@storix/shared'
import { CardFace } from '@/features/cards/components/card-face'
import { CardImage } from '@/features/cards/components/card-image'

interface RevealSpotlightProps {
  pull: BoosterPull
}

const MONTH_FORMAT = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' })

function formatMonth(value: string | null): string | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : MONTH_FORMAT.format(date)
}

function badgeLabel(pull: BoosterPull): string | null {
  if (pull.isFirstCopy && pull.isDiscovery) return 'Nouvelle · Découverte par toi'
  return pull.isFirstCopy ? 'Nouvelle' : null
}

export function RevealSpotlight({ pull }: RevealSpotlightProps) {
  const { card } = pull
  const badge = badgeLabel(pull)
  const month = formatMonth(card.capturedAt)
  const author = card.author.displayUsername ?? 'Ancien membre'

  return (
    <m.div
      key={card.id}
      className={`reveal ${pull.variant === 'foil' ? 'foil' : ''}`}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', duration: 0.45, bounce: 0.2 }}
    >
      <CardFace size="xl" title={card.title} tier={card.tier} isProvisional={false}>
        <CardImage
          image={card.image}
          thumbhash={card.thumbhash}
          width={card.width}
          height={card.height}
          sizes="236px"
          isEager
        />
      </CardFace>
      <div className="pills">
        {badge ? <span className="badge-new">{badge}</span> : null}
        {pull.variant === 'foil' ? <span className="pill gold">Foil</span> : null}
      </div>
      <p className="reveal-name">{card.title}</p>
      <p className="reveal-by">{month ? `Photo de ${author} · ${month}` : `Photo de ${author}`}</p>
    </m.div>
  )
}
