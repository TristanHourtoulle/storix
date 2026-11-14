import type { CSSProperties } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Avatar } from '@/components/ui/avatar'
import { daysLeftLabel, postsLabel } from '../series-copy'
import { themeCardQueryOptions } from '../series.queries'

interface ThemeCardProps {
  leagueId: string
}

/** Home card of the weekly theme: name, days left, who posted, and shortcuts to add a photo or open the series. */
export function ThemeCard({ leagueId }: ThemeCardProps) {
  const { data } = useQuery(themeCardQueryOptions(leagueId))
  if (data === undefined) return null
  const { series, contributors } = data
  return (
    <section
      className="home-theme"
      style={{ '--sc': series.color } as CSSProperties}
      aria-label="Thème de la semaine"
    >
      <div className="home-theme-top">
        <span className="home-theme-em" aria-hidden="true">
          {series.emoji}
        </span>
        <div>
          <small>Thème de la semaine</small>
          <b>{series.title}</b>
        </div>
        <span className="home-theme-left">{daysLeftLabel(data.daysLeft)}</span>
      </div>
      <div className="home-theme-stack">
        {contributors.length > 0 ? (
          <span className="home-theme-avs">
            {contributors.map((contributor) => (
              <span key={contributor.userId} className="home-theme-av">
                <Avatar
                  label={contributor.displayUsername}
                  portrait={contributor.avatar}
                  frame={contributor.avatarFrame}
                  size="mini"
                  isTinted
                />
              </span>
            ))}
          </span>
        ) : null}
        <span>
          {series.cardCount === 0
            ? 'Personne n’a encore posté'
            : postsLabel(series.cardCount, data.memberCount)}
        </span>
      </div>
      <div className="home-theme-row">
        <Link
          to="/l/$leagueId/add"
          params={{ leagueId }}
          search={{ theme: series.id }}
          className="home-theme-cta"
        >
          ＋ Ajouter
        </Link>
        <Link
          to="/l/$leagueId/series/$seriesId"
          params={{ leagueId, seriesId: series.id }}
          className="home-theme-cta is-ghost"
        >
          Voir la série
        </Link>
      </div>
    </section>
  )
}
