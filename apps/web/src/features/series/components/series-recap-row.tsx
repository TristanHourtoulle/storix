import type { CSSProperties } from 'react'
import { Link } from '@tanstack/react-router'
import type { CosmeticItemId, FeedRow } from '@storix/shared'
import { StyledName } from '@/features/cosmetics/components/styled-name'
import { MiniCard } from '@/features/cards/components/mini-card'
import { actorName } from '@/features/league-feed/feed-copy'
import { cardsLabel } from '../series-copy'

interface SeriesRecapRowProps {
  leagueId: string
  row: FeedRow
  nameStyles: ReadonlyMap<string, CosmeticItemId>
}

const STRIP_SIZES = '64px'

/** Feed recap of a closed series: name, next theme, five cards and the counters; opens the series page. */
export function SeriesRecapRow({ leagueId, row, nameStyles }: SeriesRecapRowProps) {
  const { series } = row
  if (series === null) return null
  const top = row.actors[0]
  const subtitle =
    series.next === null
      ? 'Thème de la semaine'
      : `Thème de la semaine · cette semaine : ${series.next.emoji} ${series.next.title}`
  return (
    <Link
      to="/l/$leagueId/series/$seriesId"
      params={{ leagueId, seriesId: series.id }}
      className="feed-recap"
      style={{ '--sc': series.color } as CSSProperties}
    >
      <span className="feed-recap-h">
        <span className="feed-recap-em" aria-hidden="true">
          {series.emoji}
        </span>
        <span>
          <b>« {series.title} » est terminé</b>
          <small>{subtitle}</small>
        </span>
      </span>
      {row.thumbs.length > 0 ? (
        <span className="feed-recap-strip">
          {row.thumbs.map((card) => (
            <MiniCard key={card.id} card={card} tier={card.tier} sizes={STRIP_SIZES} />
          ))}
        </span>
      ) : null}
      <span className="feed-recap-stats">
        <span className="feed-stat">
          <b>{series.cardCount}</b> {series.cardCount > 1 ? 'cartes' : 'carte'}
        </span>
        <span className="feed-stat">
          <b>{series.memberCount}</b> {series.memberCount > 1 ? 'membres' : 'membre'}
        </span>
        {top !== undefined && top.userId !== null && series.topCount > 0 ? (
          <span className="feed-stat">
            <StyledName styleId={nameStyles.get(top.userId) ?? null}>{actorName(top)}</StyledName> :{' '}
            <b>{series.topCount}</b> {series.topCount > 1 ? 'photos' : 'photo'}
          </span>
        ) : null}
      </span>
      <span className="sr-only">{cardsLabel(series.cardCount)}</span>
    </Link>
  )
}
