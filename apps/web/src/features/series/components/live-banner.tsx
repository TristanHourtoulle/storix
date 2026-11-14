import type { CSSProperties } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import type { EventSummary } from '@storix/shared'
import { Icon } from '@/components/ui/icon'
import { untilLabel } from '../event-copy'
import { postsLabel } from '../series-copy'
import { eventsQueryOptions } from '../series.queries'

interface LiveBannerProps {
  leagueId: string
}

function GraceBanner({ leagueId, event }: { leagueId: string; event: EventSummary }) {
  return (
    <section
      className="live-banner is-grace"
      style={{ '--sc': event.color } as CSSProperties}
      aria-label={`${event.title} est terminé`}
    >
      <div className="live-banner-top">
        <span className="live-banner-ic">
          <Icon name={event.icon} className="size-5" />
        </span>
        <div>
          <span className="live-dot is-done">Terminé</span>
          <b>{event.title}</b>
          <small>photos {untilLabel(new Date(event.graceEndsAt))}</small>
        </div>
      </div>
      <Link
        to="/l/$leagueId/add"
        params={{ leagueId }}
        search={{ series: event.id }}
        className="home-theme-cta is-ghost"
      >
        <Icon name="camera" className="size-5" /> Ajouter une photo
      </Link>
    </section>
  )
}

/** Home banner of the live event, ending first, with a shortcut to take a photo; a compact one in its grace window. */
export function LiveBanner({ leagueId }: LiveBannerProps) {
  const { data } = useQuery(eventsQueryOptions(leagueId))
  if (data === undefined) return null
  const [live, ...others] = data.live
  if (live === undefined) {
    const [grace] = data.grace
    return grace === undefined ? null : <GraceBanner leagueId={leagueId} event={grace} />
  }
  return (
    <section
      className="live-banner"
      style={{ '--sc': live.color } as CSSProperties}
      aria-label={`${live.title} en direct`}
    >
      <div className="live-banner-top">
        <span className="live-banner-ic">
          <Icon name={live.icon} className="size-6" />
        </span>
        <div>
          <span className="live-dot">En direct</span>
          <b>{live.title}</b>
          <small>
            {untilLabel(new Date(live.endsAt))} · {postsLabel(live.cardCount, live.memberCount)}
          </small>
        </div>
      </div>
      <Link
        to="/l/$leagueId/add"
        params={{ leagueId }}
        search={{ series: live.id }}
        className="home-theme-cta"
      >
        <Icon name="camera" className="size-5" /> Prendre une photo
      </Link>
      {others.length > 0 ? (
        <Link to="/l/$leagueId/collection" params={{ leagueId }} className="live-banner-more">
          +{others.length} événement{others.length > 1 ? 's' : ''} en direct
        </Link>
      ) : null}
    </section>
  )
}

/** Tells whether an event is live, so the home shows its banner instead of the theme card. */
export function useHasLiveEvent(leagueId: string): boolean {
  const { data } = useQuery(eventsQueryOptions(leagueId))
  return (data?.live.length ?? 0) > 0
}
