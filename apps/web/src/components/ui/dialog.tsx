import { useEffect, useRef, type ReactNode } from 'react'
import { Icon } from './icon'

interface DialogProps {
  open: boolean
  title: string
  onClose: () => void
  isDismissible?: boolean
  children: ReactNode
}

export function Dialog({ open, title, onClose, isDismissible = true, children }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={(event) => {
        if (!isDismissible) event.preventDefault()
      }}
      onClick={(event) => {
        if (isDismissible && event.target === ref.current) onClose()
      }}
      aria-label={title}
      className="m-auto w-[calc(100%-32px)] max-w-[440px] rounded-panel border-0 bg-surface p-0 text-ink shadow-hairline backdrop:bg-board/80"
    >
      <div className="flex flex-col gap-4 p-5">
        <div className="flex items-center justify-between gap-3">
          <h2>{title}</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={!isDismissible}
            aria-label="Fermer"
            className="icon-btn"
          >
            <Icon name="close" className="size-5" />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  )
}
