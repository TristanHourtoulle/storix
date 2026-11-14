import type { CSSProperties } from 'react'
import type { CardSeal } from '@storix/shared'

interface SeriesSealsProps {
  seals: readonly CardSeal[]
}

const MAX_SEALS = 2

/** The round emoji seals of a card's series, at its top-left corner. */
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
          <span aria-hidden="true">{seal.emoji}</span>
          <span className="sr-only">{`Série ${seal.title}`}</span>
        </span>
      ))}
    </span>
  )
}
