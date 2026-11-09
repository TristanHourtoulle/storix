import type { CSSProperties, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import type { CardTier } from '@storix/shared'
import { Icon } from '@/components/ui/icon'
import { useModalLayer } from '@/components/crop/use-modal-layer'
import { useHoloTilt } from '../use-holo-tilt'
import { TIER_COLOR_VAR } from '../tier-labels'

interface CardFullscreenProps {
  tier: CardTier
  children: ReactNode
  onClose: () => void
}

/** Shows a card face full screen with tilt, closing on X, a background tap or Escape. */
export function CardFullscreen({ tier, children, onClose }: CardFullscreenProps) {
  const { container, layerRef } = useModalLayer(onClose)
  const { ref } = useHoloTilt()
  const style = { '--fc': TIER_COLOR_VAR[tier] } as CSSProperties

  return createPortal(
    <div
      ref={layerRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label="Carte en plein écran"
      className="card-fullscreen"
      style={style}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <button
        type="button"
        className="icon-btn card-fullscreen-close"
        aria-label="Fermer"
        onClick={onClose}
      >
        <Icon name="close" className="size-5" />
      </button>
      <div className="tilt" ref={ref}>
        {children}
      </div>
      <p className="card-fullscreen-hint m-0">Glisse pour incliner · touche le fond pour fermer</p>
    </div>,
    container,
  )
}
