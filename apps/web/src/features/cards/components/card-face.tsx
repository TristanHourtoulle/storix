import type { ReactNode, Ref } from 'react'
import type { CardMoment, CardSeal, CardTier } from '@storix/shared'
import { raritySetClass } from '@/features/cosmetics/cosmetic-skins'
import { useEquippedStyle } from '@/features/cosmetics/style-context'
import { MomentCardOverlay } from '@/features/moments/components/moment-card-overlay'
import { SeriesSeals } from '@/features/series/components/series-seals'
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
  moment?: CardMoment | null
  seals?: readonly CardSeal[]
}

const NO_SEALS: readonly CardSeal[] = []

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
  moment = null,
  seals = NO_SEALS,
}: CardFaceProps) {
  const tierLabel = isPromoted ? `${TIER_LABELS[tier]} ★` : TIER_LABELS[tier]
  const tierLine = isProvisional ? `${tierLabel} · provisoire` : tierLabel
  const raritySet = raritySetClass(useEquippedStyle().raritySet)

  return (
    <div
      className={`card ${size} ${TIER_CLASS[tier]}${raritySet ? ` ${raritySet}` : ''}${isFoil ? ' foil' : ''}${moment ? ' moment' : ''}${seals.length > 0 ? ' has-seal' : ''} ${className}`}
    >
      <div className="card-art">{children}</div>
      {raritySet ? <span className="card-frame" aria-hidden="true" /> : null}
      <div className="card-holo" ref={holoRef} />
      {moment ? <MomentCardOverlay moment={moment} size={size} /> : null}
      <span className="card-gem" />
      <SeriesSeals seals={seals} />
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
