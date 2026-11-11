import type { CSSProperties, ReactNode } from 'react'
import type { CardTier } from '@storix/shared'
import { TIER_COLOR_VAR } from '@/features/cards/tier-labels'
import { revealAuraKind } from '../cosmetic-skins'
import { useEquippedStyle } from '../style-context'
import '@/styles/cosmetics-arcade.css'

interface AuraDemoProps {
  children?: ReactNode
  isStage?: boolean
  width?: number
  tier?: CardTier
}

/** A lit card wrapped in the worn reveal aura, as it glows just before flipping. */
export function AuraDemo({ children, isStage = false, width, tier = 'legendary' }: AuraDemoProps) {
  const tint = { '--tc': TIER_COLOR_VAR[tier] } as CSSProperties
  const kind = revealAuraKind(useEquippedStyle().revealAura)
  const particles = kind ? <span className={`ar-aura-fx is-${kind}`} aria-hidden="true" /> : null
  if (isStage) {
    return (
      <div className="shop-aura-stage" style={tint}>
        <span className="shop-aura-glow" aria-hidden="true" />
        {particles}
        {children}
      </div>
    )
  }
  return (
    <span className="shop-aura-demo" style={{ ...tint, width }} aria-hidden="true">
      {particles}
    </span>
  )
}
