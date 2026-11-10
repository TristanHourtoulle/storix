import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useModalLayer } from '@/components/crop/use-modal-layer'
import '@/styles/bottom-sheet.css'

interface BottomSheetProps {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}

/** Modal sheet sliding up from the bottom of the screen, with a scrim and a grab handle. */
export function BottomSheet({ open, ...rest }: BottomSheetProps) {
  return open ? <BottomSheetLayer {...rest} /> : null
}

type BottomSheetLayerProps = Omit<BottomSheetProps, 'open'>

function BottomSheetLayer({ title, onClose, children }: BottomSheetLayerProps) {
  const { container, layerRef } = useModalLayer(onClose)

  return createPortal(
    <div
      ref={layerRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="bsheet-layer"
    >
      <button
        type="button"
        className="bsheet-scrim"
        aria-label="Fermer"
        tabIndex={-1}
        onClick={onClose}
      />
      <div className="bsheet">
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
