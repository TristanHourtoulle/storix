import type { CSSProperties } from 'react'
import { Link } from '@tanstack/react-router'
import type { SeriesSummary } from '@storix/shared'
import { cardsLabel, isSeriesOpen, seriesPercent } from '../series-copy'
import { Icon } from '@/components/ui/icon'

interface SeriesTileProps {
  leagueId: string
  series: SeriesSummary
}

/** A shelf tile: icon, name, then « ● En cours · N cartes » while open or « owned / total » with a bar once closed. */
export function SeriesTile({ leagueId, series }: SeriesTileProps) {
  const isOpen = isSeriesOpen(series)
  const isComplete = series.cardCount > 0 && series.ownedCount === series.cardCount
  return (
    <Link
      to="/l/$leagueId/series/$seriesId"
      params={{ leagueId, seriesId: series.id }}
      className="stile"
      style={{ '--sc': series.color } as CSSProperties}
    >
      <span className="stile-em">
        <Icon name={series.icon} className="size-[18px]" />
      </span>
      <b>{series.title}</b>
      {isOpen ? (
        <span className="stile-live">● En cours · {cardsLabel(series.cardCount)}</span>
      ) : (
        <>
          <span className="stile-meta">
            {series.ownedCount} / {series.cardCount}
            {isComplete ? ' · complète' : ''}
          </span>
          <span className="series-prog" aria-hidden="true">
            <i style={{ width: `${seriesPercent(series)}%` }} />
          </span>
        </>
      )}
    </Link>
  )
}
