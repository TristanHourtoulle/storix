import { useMemo } from 'react'
import type { CardTier } from '@storix/shared'
import { CardFace, type CardFaceProps } from '@/features/cards/components/card-face'
import { momentStampKind } from '../cosmetic-skins'
import { useEquippedStyle } from '../style-context'

const SAMPLE_TITLES: Readonly<Record<CardTier, string>> = {
  common: 'Cuisine du dimanche',
  uncommon: 'Balade en forêt',
  rare: 'Dernier métro',
  epic: 'Soirée néon',
  legendary: 'Plage au réveil',
  mythic: 'Terrasse au soleil',
}

interface SampleCardFaceProps {
  tier: CardTier
  size: CardFaceProps['size']
}

/** An example card of a tier, drawn without a photo, for previews when the viewer lacks real cards. */
export function SampleCardFace({ tier, size }: SampleCardFaceProps) {
  return (
    <CardFace size={size} title={SAMPLE_TITLES[tier]} tier={tier} isProvisional={false}>
      <span className={`shop-sample is-${tier}`} aria-hidden="true" />
    </CardFace>
  )
}

const SAMPLE_MOMENT_TAKEN_AT = '2026-11-11T13:32:00.000Z'

/** An example Moment card wearing the Moment stamp of this subtree, for the shop and the cabin. */
export function SampleMomentFace({ size }: Pick<SampleCardFaceProps, 'size'>) {
  const stamp = useEquippedStyle().momentStamp
  const kind = momentStampKind(stamp)
  const moment = useMemo(
    () => ({
      selfieUrl: null,
      selfieSmallUrl: null,
      takenAt: SAMPLE_MOMENT_TAKEN_AT,
      lateMinutes: 0,
      stamp,
    }),
    [stamp],
  )
  return (
    <CardFace
      size={size}
      title="Café avant l'orage"
      tier="rare"
      isProvisional={false}
      moment={moment}
    >
      <span className="shop-sample is-moment" aria-hidden="true" />
      <span
        className={`moment-inset shop-sample-selfie${kind === null ? '' : ` is-${kind}`}`}
        aria-hidden="true"
      />
    </CardFace>
  )
}
