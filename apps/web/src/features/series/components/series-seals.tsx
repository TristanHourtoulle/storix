import type { CSSProperties } from 'react'
import type { CardSeal } from '@storix/shared'
import { Icon } from '@/components/ui/icon'

interface SeriesSealsProps {
  seals: readonly CardSeal[]
}

const MAX_SEALS = 2

/** The holo medallions of a card's series, with their line icon, at its top-left corner. */
export function SeriesSeals({ seals }: SeriesSealsProps) {
  if (seals.length === 0) return null
  return (
    <span className="card-seals">
      {seals.slice(0, MAX_SEALS).map((seal) => (
        <span
          key={seal.seriesId}
          className="card-seal"
          style={{ '--sc': seal.color } as CSSProperties}
          title={seal.title}
        >
          <Icon name={seal.icon} className="card-seal-ic" />
          <span className="sr-only">{`Série ${seal.title}`}</span>
        </span>
      ))}
    </span>
  )
}
