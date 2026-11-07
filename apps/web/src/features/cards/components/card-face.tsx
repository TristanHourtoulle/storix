import type { ReactNode, Ref } from 'react'
import type { CardTier } from '@storix/shared'
import { TIER_CLASS, TIER_LABELS } from '../tier-labels'

interface CardFaceProps {
  size: 'sm' | 'md' | 'lg' | 'xl'
  title: string
  tier: CardTier
  isProvisional: boolean
  children: ReactNode
  holoRef?: Ref<HTMLDivElement>
  isFoil?: boolean
  hasFoilPip?: boolean
}

export function CardFace({
  size,
  title,
  tier,
  isProvisional,
  children,
  holoRef,
  isFoil = false,
  hasFoilPip = false,
}: CardFaceProps) {
  const tierLine = isProvisional ? `${TIER_LABELS[tier]} · provisoire` : TIER_LABELS[tier]

  return (
    <div className={`card ${size} ${TIER_CLASS[tier]}${isFoil ? ' foil' : ''}`}>
      <div className="card-art">{children}</div>
      <div className="card-holo" ref={holoRef} />
      <span className="card-gem" />
      {hasFoilPip ? <span className="card-foil-pip" aria-hidden="true" /> : null}
      <div className="card-band">
        <span className="card-name">{title}</span>
        <span className="card-tier">{tierLine}</span>
      </div>
    </div>
  )
}
