import { Notice } from '@/components/ui/notice'

interface RemovalNoticeProps {
  count: number
  dust: number
  onClose: () => void
}

export function RemovalNotice({ count, dust, onClose }: RemovalNoticeProps) {
  const label = count > 1 ? 'cartes retirées' : 'carte retirée'
  return (
    <Notice tone="info">
      <div className="flex items-center justify-between gap-3">
        <span>
          {count} {label} de la ligue · +{dust} paillettes
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="shrink-0 cursor-pointer border-0 bg-transparent p-1 text-inherit"
        >
          ×
        </button>
      </div>
    </Notice>
  )
}
