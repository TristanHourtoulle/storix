import type { CSSProperties } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import type { OwnedCardDetail, SeriesSummary } from '@storix/shared'
import { isSeriesOpen } from '../series-copy'
import { themeCardQueryOptions } from '../series.queries'
import { useAddCardToSeries } from '../use-series-mutations'
import { Icon } from '@/components/ui/icon'

interface CardSeriesProps {
  leagueId: string
  card: OwnedCardDetail
  meId: string
}

function canJoin(card: OwnedCardDetail, meId: string, theme: SeriesSummary | undefined): boolean {
  if (theme === undefined || !isSeriesOpen(theme) || card.author.userId !== meId) return false
  if (card.seals.some((seal) => seal.seriesId === theme.id)) return false
  const createdAt = new Date(card.createdAt).getTime()
  return (
    createdAt >= new Date(theme.startsAt).getTime() && createdAt < new Date(theme.endsAt).getTime()
  )
}

/** The series a card belongs to, with « Ajouter au thème » for the author's own photo of the week. */
export function CardSeries({ leagueId, card, meId }: CardSeriesProps) {
  const theme = useQuery(themeCardQueryOptions(leagueId)).data?.series
  const add = useAddCardToSeries(leagueId, card.id)
  const isJoinable = canJoin(card, meId, theme)
  if (card.seals.length === 0 && !isJoinable) return null
  return (
    <div className="card-series">
      {card.seals.map((seal) => (
        <Link
          key={seal.seriesId}
          to="/l/$leagueId/series/$seriesId"
          params={{ leagueId, seriesId: seal.seriesId }}
          className="series-chip"
          style={{ '--sc': seal.color } as CSSProperties}
        >
          <Icon name={seal.icon} className="series-chip-ic" /> {seal.title}
        </Link>
      ))}
      {isJoinable && theme !== undefined ? (
        <button
          type="button"
          className="series-chip is-add"
          style={{ '--sc': theme.color } as CSSProperties}
          disabled={add.isPending}
          onClick={() => add.mutate(theme.id)}
        >
          <Icon name="plus" className="series-chip-ic" /> Ajouter au thème {theme.title}
        </button>
      ) : null}
    </div>
  )
}
