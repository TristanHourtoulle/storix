import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useModalLayer } from '@/components/crop/use-modal-layer'
import '@/styles/bottom-sheet.css'

interface BottomSheetProps {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}

const EXIT_MS = 240
const EXIT_FALLBACK_MS = EXIT_MS + 80

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Modal sheet sliding up from the bottom of the screen, with a scrim and a grab handle.
 * Wrap actions in an element with the `bsheet-footer` class to keep them pinned while the body scrolls.
 */
export function BottomSheet({ open, ...rest }: BottomSheetProps) {
  const [isRendered, setIsRendered] = useState(open)
  if (open && !isRendered) setIsRendered(true)
  const isClosing = isRendered && !open

  useEffect(() => {
    if (!isClosing) return
    const timer = window.setTimeout(
      () => setIsRendered(false),
      prefersReducedMotion() ? 0 : EXIT_FALLBACK_MS,
    )
    return () => window.clearTimeout(timer)
  }, [isClosing])

  return isRendered ? (
    <BottomSheetLayer {...rest} isClosing={isClosing} onExited={() => setIsRendered(false)} />
  ) : null
}

interface BottomSheetLayerProps extends Omit<BottomSheetProps, 'open'> {
  isClosing: boolean
  onExited: () => void
}

function BottomSheetLayer({
  title,
  onClose,
  children,
  isClosing,
  onExited,
}: BottomSheetLayerProps) {
  const { container, layerRef } = useModalLayer(onClose)

  return createPortal(
    <div
      ref={layerRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className={`bsheet-layer ${isClosing ? 'is-closing' : ''}`}
    >
      <button
        type="button"
        className="bsheet-scrim"
        aria-label="Fermer"
        tabIndex={-1}
        onClick={onClose}
      />
      <div
        className="bsheet"
        onAnimationEnd={(event) => {
          if (isClosing && event.target === event.currentTarget) onExited()
        }}
      >
        <span className="bsheet-grab" aria-hidden="true" />
        <div className="bsheet-body">
          <h2 className="bsheet-title">{title}</h2>
          {children}
        </div>
      </div>
    </div>,
    container,
  )
}
