import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { userMessage } from '@/features/errors/user-message'
import { CAMERA_COPY } from '@/features/uploads/camera/camera-copy'
import type { CameraStream } from '@/features/uploads/camera/camera-types'
import { countdownLabel, momentAutoTitle } from '../moment-copy'
import { currentMomentQueryOptions } from '../moments.queries'
import { useMomentCapture, type MomentShot } from '../use-moment-capture'
import { useNow } from '../use-now'
import { usePostMoment } from '../use-post-moment'
import { MomentPreview } from './moment-preview'

interface MomentCaptureProps {
  leagueId: string
}

function MomentTimer({ leagueId }: { leagueId: string }) {
  const { data: moment } = useQuery(currentMomentQueryOptions(leagueId))
  const now = useNow(moment !== undefined)
  if (moment === undefined) return <span className="moment-timer" />
  const remaining = new Date(moment.windowEndsAt).getTime() - now.getTime()
  return remaining > 0 ? (
    <span className="moment-timer">{countdownLabel(remaining)}</span>
  ) : (
    <span className="moment-timer is-late">En retard</span>
  )
}

function CameraState({ camera }: { camera: CameraStream }) {
  switch (camera.phase) {
    case 'priming':
    case 'paused':
      return (
        <div className="moment-vf-state">
          <p>{CAMERA_COPY.primingBody}</p>
          <button type="button" className="moment-btn" onClick={camera.enable}>
            {camera.phase === 'paused' ? CAMERA_COPY.resume : CAMERA_COPY.primingAction}
          </button>
        </div>
      )
    case 'denied':
    case 'busy':
    case 'unavailable':
      return (
        <div className="moment-vf-state">
          <p>
            {camera.phase === 'denied'
              ? CAMERA_COPY.deniedBodyOther
              : camera.phase === 'busy'
                ? CAMERA_COPY.busyBody
                : 'L’appareil photo n’est pas disponible.'}
          </p>
          {camera.canRetry ? (
            <button type="button" className="moment-btn" onClick={camera.enable}>
              {CAMERA_COPY.retry}
            </button>
          ) : null}
        </div>
      )
    default:
      return null
  }
}

function LiveVideo({ camera }: { camera: CameraStream }) {
  const { videoRef, phase, isMirrored } = camera
  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      disablePictureInPicture
      className={`moment-video${phase === 'live' ? '' : ' is-hidden'}`}
      style={isMirrored ? { transform: 'scaleX(-1)' } : undefined}
    />
  )
}

function FrozenShot({ shot, className }: { shot: MomentShot; className: string }) {
  return <img src={shot.url} alt="" className={className} />
}

/** The Moment capture screen: back photo, split screen with the 3-2-1 selfie, preview and publication. */
export function MomentCapture({ leagueId }: MomentCaptureProps) {
  const post = usePostMoment(leagueId)
  const capture = useMomentCapture(true, post.reserve)
  const { data: moment } = useQuery(currentMomentQueryOptions(leagueId))
  const [title, setTitle] = useState('')
  const { step, camera, back, front, countdown } = capture

  if (step === 'preview' && back !== null && front !== null) {
    const capturedAt = new Date(back.file.lastModified)
    return (
      <MomentPreview
        leagueId={leagueId}
        back={back}
        front={front}
        autoTitle={momentAutoTitle(moment === undefined ? capturedAt : new Date(moment.firesAt))}
        title={title}
        isLate={moment !== undefined && capturedAt > new Date(moment.windowEndsAt)}
        result={post.data ?? null}
        isPublishing={post.isPending}
        error={post.error === null ? null : userMessage(post.error)}
        onTitleChange={setTitle}
        onPublish={() => post.mutate({ back: back.file, front: front.file, title })}
        onRetake={() => {
          post.reset()
          capture.retake()
        }}
      />
    )
  }

  const isFront = step === 'front' && back !== null
  return (
    <main className="moment-vf">
      <div className="moment-vf-top">
        {isFront ? (
          <button type="button" className="moment-vf-link" onClick={capture.retake}>
            Refaire
          </button>
        ) : (
          <Link to="/l/$leagueId" params={{ leagueId }} className="moment-vf-link">
            Annuler
          </Link>
        )}
        <MomentTimer leagueId={leagueId} />
      </div>
      <div className="moment-vf-photo">
        {isFront ? (
          <>
            <FrozenShot shot={back} className="moment-vf-half is-top" />
            <div className="moment-vf-half is-bottom">
              <LiveVideo camera={camera} />
              <CameraState camera={camera} />
              {countdown !== null && countdown > 0 ? (
                <span className="moment-count" aria-live="assertive">
                  {countdown}
                </span>
              ) : null}
            </div>
          </>
        ) : (
          <>
            <LiveVideo camera={camera} />
            <CameraState camera={camera} />
          </>
        )}
      </div>
      <div className="moment-vf-bottom">
        <div className="moment-steps" aria-label="Étapes">
          <span className={isFront ? '' : 'is-on'}>1 · Devant toi</span>
          <span className={isFront ? 'is-on' : ''}>2 · Toi</span>
        </div>
        <button
          type="button"
          className="moment-shutter"
          aria-label={isFront ? 'Prendre le selfie' : 'Prendre la photo'}
          disabled={camera.phase !== 'live'}
          onClick={capture.shoot}
        />
      </div>
    </main>
  )
}
