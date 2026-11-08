import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'

interface CropControlsProps {
  zoom: number
  maxZoom: number
  allowRotate: boolean
  isDefault: boolean
  onZoom: (zoom: number) => void
  onRotate: () => void
  onReset: () => void
}

export function CropControls({
  zoom,
  maxZoom,
  allowRotate,
  isDefault,
  onZoom,
  onRotate,
  onReset,
}: CropControlsProps) {
  return (
    <div className="flex flex-none touch-none flex-col gap-2.5 bg-bg px-4 pt-3 pb-[max(20px,env(safe-area-inset-bottom))] shadow-[inset_0_1px_0_var(--color-line)]">
      <label className="flex items-center gap-3 text-[12px] text-muted">
        Zoom
        <input
          type="range"
          aria-label="Zoom"
          min={1}
          max={maxZoom}
          step={0.01}
          value={zoom}
          disabled={maxZoom <= 1}
          onChange={(event) => onZoom(Number(event.currentTarget.value))}
          className="min-w-0 flex-1 accent-accent"
        />
      </label>
      <div className="flex gap-2.5">
        {allowRotate ? (
          <Button variant="ghost" className="!h-10 flex-1 !text-sm" onClick={onRotate}>
            <Icon name="rotate" className="size-4" />
            Pivoter
          </Button>
        ) : null}
        <Button
          variant="ghost"
          className="!h-10 flex-1 !text-sm"
          disabled={isDefault}
          onClick={onReset}
        >
          Réinitialiser
        </Button>
      </div>
      <p className="m-0 text-center text-[12px] text-faint">
        Pince pour zoomer, glisse pour cadrer. Sans retouche, la photo est centrée automatiquement.
      </p>
    </div>
  )
}
