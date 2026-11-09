import { useRef, type CSSProperties, type HTMLAttributes, type ReactNode, type Ref } from 'react'
import { createPortal } from 'react-dom'
import type { CardTier } from '@storix/shared'
import { Icon } from '@/components/ui/icon'
import { useModalLayer } from '@/components/crop/use-modal-layer'
import { useHoloTilt } from '../use-holo-tilt'
import { TIER_COLOR_VAR } from '../tier-labels'

const TAP_SLOP_PX = 10

type StageHandlers = Pick<HTMLAttributes<HTMLDivElement>, 'onPointerDown' | 'onPointerUp' | 'onPointerCancel'>

interface CardFullscreenProps {
  tier: CardTier
  children: ReactNode
  onClose: () => void
  label?: string
  hint?: string | null
  header?: ReactNode
  footer?: ReactNode
  className?: string
  flightRef?: Ref<HTMLDivElement>
  stageHandlers?: StageHandlers
}

interface PressStart {
  x: number
  y: number
  isOnBackground: boolean
}

/** Shows a card face full screen with tilt, closing on X, a background tap or Escape. */
export function CardFullscreen({
  tier,
  children,
  onClose,
  label = 'Carte en plein écran',
  hint = 'Glisse pour incliner · touche le fond pour fermer',
  header,
  footer,
  className,
  flightRef,
  stageHandlers,
}: CardFullscreenProps) {
  const { container, layerRef } = useModalLayer(onClose)
  const { ref } = useHoloTilt()
  const press = useRef<PressStart | null>(null)
  const style = { '--fc': TIER_COLOR_VAR[tier] } as CSSProperties

  return createPortal(
    <div
      ref={layerRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={label}
      className={className ? `card-fullscreen ${className}` : 'card-fullscreen'}
      style={style}
      onPointerDownCapture={(event) => {
        press.current = {
          x: event.clientX,
          y: event.clientY,
          isOnBackground: event.target === event.currentTarget,
        }
      }}
      onClick={(event) => {
        const start = press.current
        press.current = null
        if (event.target !== event.currentTarget) return
        const isKeyboardClick = event.detail === 0
        const isTap =
          start !== null &&
          start.isOnBackground &&
          Math.hypot(event.clientX - start.x, event.clientY - start.y) < TAP_SLOP_PX
        if (isKeyboardClick || isTap) onClose()
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
      {header}
      <div className="card-fullscreen-flight" ref={flightRef} {...stageHandlers}>
        <div className="tilt" ref={ref}>
          {children}
        </div>
      </div>
      {footer}
      {hint ? <p className="card-fullscreen-hint m-0">{hint}</p> : null}
    </div>,
    container,
  )
}
