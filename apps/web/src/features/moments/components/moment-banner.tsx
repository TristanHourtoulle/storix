import { Link } from '@tanstack/react-router'
import { formatMomentLateness } from '@storix/shared'
import { countdownLabel } from '../moment-copy'

interface MomentBannerProps {
  leagueId: string
  isWindowOpen: boolean
  remainingMs: number
  lateMinutes: number
}

/** The home banner inviting a member who has not posted the current Moment yet, late or not. */
export function MomentBanner({
  leagueId,
  isWindowOpen,
  remainingMs,
  lateMinutes,
}: MomentBannerProps) {
  return (
    <section className="moment-banner" aria-label="Le Moment">
      <span className="moment-banner-ico" aria-hidden="true">
        ⚡
      </span>
      <div className="moment-banner-text">
        <b>{isWindowOpen ? 'C’est le Moment' : 'Poste ton Moment'}</b>
        <span>
          {isWindowOpen
            ? `Il reste ${countdownLabel(remainingMs)}`
            : `En retard · ${formatMomentLateness(lateMinutes)}`}
        </span>
      </div>
      <Link to="/l/$leagueId/moment" params={{ leagueId }} className="moment-banner-cta">
        Poster
      </Link>
    </section>
  )
}
