import { formatMomentLateness, type CardMoment } from '@storix/shared'
import { useState } from 'react'

interface MomentCardOverlayProps {
  moment: CardMoment
  size: 'sm' | 'md' | 'lg' | 'xl' | 'showcase'
}

const isLarge = (size: MomentCardOverlayProps['size']): boolean =>
  size === 'lg' || size === 'xl' || size === 'showcase'

/** The Moment decoration of a card: the selfie inset, the "Moment" badge and the late pill. */
export function MomentCardOverlay({ moment, size }: MomentCardOverlayProps) {
  const [hasFailed, setHasFailed] = useState(false)
  const large = isLarge(size)
  const selfieUrl = large ? moment.selfieUrl : moment.selfieSmallUrl

  return (
    <>
      {selfieUrl === null || hasFailed ? null : (
        <span className="moment-inset">
          <img
            src={selfieUrl}
            alt=""
            loading="lazy"
            decoding="async"
            onError={() => setHasFailed(true)}
          />
        </span>
      )}
      {moment.lateMinutes > 0 ? (
        <span className="moment-late">+{formatMomentLateness(moment.lateMinutes)}</span>
      ) : null}
      <span className="moment-badge">{large ? 'MOMENT' : '⚡'}</span>
      <span className="sr-only">
        {moment.lateMinutes > 0
          ? `Carte Moment, postée en retard de ${formatMomentLateness(moment.lateMinutes)}`
          : 'Carte Moment, postée à l’heure'}
      </span>
    </>
  )
}
