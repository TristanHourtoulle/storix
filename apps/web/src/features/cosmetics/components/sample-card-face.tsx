import type { CardTier } from '@storix/shared'
import { CardFace, type CardFaceProps } from '@/features/cards/components/card-face'

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
