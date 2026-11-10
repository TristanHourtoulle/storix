import type { ReactNode, Ref } from 'react'
import type { CardTier } from '@storix/shared'
import { countLabel } from '../progression-copy'
import { TIER_CLASS, TIER_LABELS } from '../tier-labels'

export interface CardFaceProps {
  size: 'sm' | 'md' | 'lg' | 'xl' | 'showcase'
  title: string
  tier: CardTier
  isProvisional: boolean
  children: ReactNode
  holoRef?: Ref<HTMLDivElement>
  isFoil?: boolean
  hasFoilPip?: boolean
  band?: ReactNode
  className?: string
  isPromoted?: boolean
  stackCount?: number
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
  band,
  className = '',
  isPromoted = false,
  stackCount = 0,
}: CardFaceProps) {
  const tierLabel = isPromoted ? `${TIER_LABELS[tier]} ★` : TIER_LABELS[tier]
  const tierLine = isProvisional ? `${tierLabel} · provisoire` : tierLabel

  return (
    <div className={`card ${size} ${TIER_CLASS[tier]}${isFoil ? ' foil' : ''} ${className}`}>
      <div className="card-art">{children}</div>
      <div className="card-holo" ref={holoRef} />
      <span className="card-gem" />
      {stackCount > 0 ? (
        <span className="card-stack-badge">
          <span aria-hidden="true">×{stackCount}</span>
          <span className="sr-only">{`${countLabel(stackCount, 'doublon', 'doublons')} en pile`}</span>
        </span>
      ) : null}
      {hasFoilPip ? <span className="card-foil-pip" aria-hidden="true" /> : null}
      {band ?? (
        <div className="card-band">
          <span className="card-name">{title}</span>
          <span className="card-tier">{tierLine}</span>
        </div>
      )}
    </div>
  )
}
