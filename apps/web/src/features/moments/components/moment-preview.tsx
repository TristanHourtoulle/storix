import { useState, type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { CARD_TITLE_MAX_LENGTH, type PostMomentResponse } from '@storix/shared'
import { latenessLabel } from '../moment-copy'
import type { MomentShot } from '../use-moment-capture'

interface MomentPreviewProps {
  leagueId: string
  back: MomentShot
  front: MomentShot
  autoTitle: string
  title: string
  isLate: boolean
  result: PostMomentResponse | null
  isPublishing: boolean
  error: string | null
  /** Series switches shown under the title, when a theme or a live event takes the Moment. */
  series?: ReactNode
  onTitleChange: (title: string) => void
  onPublish: () => void
  onRetake: () => void
}

const TITLE_INPUT_ID = 'moment-title'
const TITLE_HINT_ID = 'moment-title-hint'

/** The Moment card preview with its optional title before publication, then its confirmation with the reward. */
export function MomentPreview({
  leagueId,
  back,
  front,
  autoTitle,
  title,
  isLate,
  result,
  isPublishing,
  error,
  series = null,
  onTitleChange,
  onPublish,
  onRetake,
}: MomentPreviewProps) {
  const [isEditing, setIsEditing] = useState(false)
  const typedTitle = title.trim()
  const isPending = result === null

  return (
    <main className="moment-preview">
      {isPending ? (
        <div className="moment-preview-top">
          <button
            type="button"
            className="moment-preview-back"
            disabled={isPublishing}
            onClick={onRetake}
          >
            Refaire
          </button>
          <span className={isLate ? 'moment-late-pill' : 'moment-ontime'}>
            {isLate ? 'En retard' : latenessLabel(0)}
          </span>
        </div>
      ) : null}
      <div className={`moment-mcard${isPending && isEditing ? ' is-compact' : ''}`}>
        <img src={back.url} alt="Photo de la caméra arrière" className="moment-mcard-photo" />
        <img src={front.url} alt="Selfie" className="moment-mcard-inset" />
        <span className="moment-mcard-badge">MOMENT</span>
        <span className="moment-mcard-band">
          <b className={typedTitle === '' ? 'is-auto' : undefined}>
            {typedTitle === '' ? autoTitle : typedTitle}
          </b>
          <small>● À découvrir dans un booster</small>
        </span>
      </div>
      {isPending ? (
        <>
          <div className="moment-title-field">
            <label htmlFor={TITLE_INPUT_ID} className="moment-title-label">
              Titre · facultatif
            </label>
            <div className="moment-title-input">
              <input
                id={TITLE_INPUT_ID}
                type="text"
                value={title}
                placeholder={autoTitle}
                maxLength={CARD_TITLE_MAX_LENGTH}
                autoComplete="off"
                enterKeyHint="done"
                aria-describedby={TITLE_HINT_ID}
                disabled={isPublishing}
                onChange={(event) => onTitleChange(event.target.value)}
                onFocus={() => setIsEditing(true)}
                onBlur={() => setIsEditing(false)}
              />
              <small aria-hidden="true">
                {title.length}/{CARD_TITLE_MAX_LENGTH}
              </small>
            </div>
            <span id={TITLE_HINT_ID} className="moment-title-hint" hidden={isEditing}>
              Laisse vide pour garder ce titre.
            </span>
          </div>
          {series}
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
