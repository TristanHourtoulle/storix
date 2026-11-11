import { Link } from '@tanstack/react-router'
import type { PostMomentResponse } from '@storix/shared'
import { latenessLabel } from '../moment-copy'
import type { MomentShot } from '../use-moment-capture'

interface MomentPreviewProps {
  leagueId: string
  back: MomentShot
  front: MomentShot
  stamp: string
  result: PostMomentResponse | null
  isPublishing: boolean
  error: string | null
  onPublish: () => void
  onRetake: () => void
}

/** The Moment card preview before publication, then its confirmation with the reward. */
export function MomentPreview({
  leagueId,
  back,
  front,
  stamp,
  result,
  isPublishing,
  error,
  onPublish,
  onRetake,
}: MomentPreviewProps) {
  return (
    <main className="moment-preview">
      <div className="moment-mcard">
        <img src={back.url} alt="Photo de la caméra arrière" className="moment-mcard-photo" />
        <img src={front.url} alt="Selfie" className="moment-mcard-inset" />
        <span className="moment-mcard-stamp">{stamp}</span>
        <span className="moment-mcard-badge">MOMENT</span>
      </div>
      {result === null ? (
        <>
          <p className="moment-preview-text">
            Ta Carte Moment rejoint la collection de toute la ligue.
          </p>
          {error ? (
            <p role="alert" className="moment-preview-error">
              {error}
            </p>
          ) : null}
          <button
            type="button"
            className="moment-btn is-block"
            disabled={isPublishing}
            onClick={onPublish}
          >
            {isPublishing ? 'Publication…' : 'Publier'}
          </button>
          <button
            type="button"
            className="moment-flash-later"
            disabled={isPublishing}
            onClick={onRetake}
          >
            Refaire
          </button>
        </>
      ) : (
        <>
          <p className="moment-preview-text">
            Ton Moment est publié. Il entre dans la pioche de la ligue.
          </p>
          <p className="moment-preview-reward">
            <span className={result.lateMinutes === 0 ? 'moment-ontime' : 'moment-late-pill'}>
              {latenessLabel(result.lateMinutes)}
            </span>
            <span>+{result.rewardDust} paillettes</span>
          </p>
          <Link to="/l/$leagueId" params={{ leagueId }} className="moment-btn is-block">
            Retour à l’accueil
          </Link>
        </>
      )}
    </main>
  )
}
