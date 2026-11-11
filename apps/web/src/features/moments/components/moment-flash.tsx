import { Link } from '@tanstack/react-router'
import { createPortal } from 'react-dom'
import { countdownLabel, flashEyebrow } from '../moment-copy'

interface MomentFlashProps {
  leagueId: string
  firesAt: Date
  remainingMs: number
  onLater: () => void
}

/** The full-screen flash shown while the Moment's 2-minute window is open. */
export function MomentFlash({ leagueId, firesAt, remainingMs, onLater }: MomentFlashProps) {
  return createPortal(
    <div
      className="moment-flash"
      role="dialog"
      aria-modal="true"
      aria-labelledby="moment-flash-title"
    >
      <div className="moment-bolt" aria-hidden="true">
        ⚡
      </div>
      <p className="moment-flash-eyebrow">{flashEyebrow(firesAt)}</p>
      <p id="moment-flash-title" className="moment-bigclock" aria-live="off">
        {countdownLabel(remainingMs)}
      </p>
      <p className="moment-flash-lead">
        Toute la ligue a 2 minutes.
        <br />
        Montre ce que tu fais, maintenant.
      </p>
      <Link to="/l/$leagueId/moment" params={{ leagueId }} className="moment-btn moment-flash-cta">
        Ouvrir la caméra
      </Link>
      <button type="button" className="moment-flash-later" onClick={onLater}>
        Plus tard (en retard)
      </button>
    </div>,
    document.body,
  )
}
