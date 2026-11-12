import { formatMomentLateness, type CardMoment } from '@storix/shared'
import { useState } from 'react'
import { momentStampKind, type MomentStampKind } from '@/features/cosmetics/cosmetic-skins'
import { parisClock } from '@/lib/paris-dates'

interface MomentCardOverlayProps {
  moment: CardMoment
  size: 'sm' | 'md' | 'lg' | 'xl' | 'showcase'
}

const isLarge = (size: MomentCardOverlayProps['size']): boolean =>
  size === 'lg' || size === 'xl' || size === 'showcase'

function MomentStamp({
  kind,
  takenAt,
  isLarge: large,
}: {
  kind: MomentStampKind | null
  takenAt: string
  isLarge: boolean
}) {
  const clock = parisClock(takenAt)
  switch (kind) {
    case null:
      return <span className="moment-badge">{large ? 'MOMENT' : '⚡'}</span>
    case 'ticket':
      return (
        <span className="moment-stamp st-ticket">
          <b>MOMENT</b>
          {large ? clock : null}
        </span>
      )
    case 'encre':
      return (
        <span className="moment-stamp st-encre">
          MOMENT
          {large ? <small>{clock}</small> : null}
        </span>
      )
    case 'polaroid':
      return (
        <>
          <span className="moment-stamp st-tape">MOMENT</span>
          {large ? <span className="st-pola">{clock.replace(':', 'h')} ♥</span> : null}
        </>
      )
  }
}

/** The Moment decoration of a card: the selfie inset, the author's Moment stamp and the late pill. */
export function MomentCardOverlay({ moment, size }: MomentCardOverlayProps) {
  const [hasFailed, setHasFailed] = useState(false)
  const large = isLarge(size)
  const selfieUrl = large ? moment.selfieUrl : moment.selfieSmallUrl
  const stamp = momentStampKind(moment.stamp)

  return (
    <>
      {selfieUrl === null || hasFailed ? null : (
        <span className={`moment-inset${stamp === null ? '' : ` is-${stamp}`}`}>
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
      <MomentStamp kind={stamp} takenAt={moment.takenAt} isLarge={large} />
      <span className="sr-only">
        {moment.lateMinutes > 0
          ? `Carte Moment, postée en retard de ${formatMomentLateness(moment.lateMinutes)}`
          : 'Carte Moment, postée à l’heure'}
      </span>
    </>
  )
}
