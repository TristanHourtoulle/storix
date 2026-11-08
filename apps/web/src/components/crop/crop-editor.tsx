import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type RefCallback,
} from 'react'
import { createPortal } from 'react-dom'
import {
  DEFAULT_CROP_VIEW,
  clampCropView,
  cropRectFromView,
  cropRectOrNull,
  cropViewFromRect,
  isDefaultCropView,
  maxCropZoom,
  rotateCropView,
  zoomCropViewAt,
  type CropFrame,
  type CropRect,
  type CropView,
  type ImageSize,
} from '@storix/shared/domain'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { CropLayer } from './cropped-image'
import { useCropGestures } from './use-crop-gestures'

export interface CropEditorProps {
  imageUrl: string
  imageSize: ImageSize
  frame: CropFrame
  value: CropRect | null
  title: string
  subtitle?: string
  shape?: 'rect' | 'circle'
  allowRotate?: boolean
  confirmLabel?: string
  onCancel: () => void
  onConfirm: (value: CropRect | null) => void
}

const FRAME_MAX_WIDTH_PX = 360
const STAGE_GUTTER_PX = 32
const FOCUSABLE = 'button:not(:disabled), input:not(:disabled), [tabindex]:not([tabindex="-1"])'
const GRID_LINES =
  'linear-gradient(90deg, transparent 33.1%, rgb(255 255 255 / 0.3) 33.1% 33.6%, transparent 33.6% 66.4%, rgb(255 255 255 / 0.3) 66.4% 66.9%, transparent 66.9%), linear-gradient(0deg, transparent 33.1%, rgb(255 255 255 / 0.3) 33.1% 33.6%, transparent 33.6% 66.4%, rgb(255 255 255 / 0.3) 66.4% 66.9%, transparent 66.9%)'

interface StageSize {
  width: number
  height: number
}

function frameWidthFor(stage: StageSize, aspect: number): number {
  const byWidth = stage.width - STAGE_GUTTER_PX
  const byHeight = (stage.height - STAGE_GUTTER_PX) * aspect
  return Math.max(0, Math.floor(Math.min(byWidth, byHeight, FRAME_MAX_WIDTH_PX)))
}

function trapTab(event: KeyboardEvent<HTMLElement>): void {
  const focusables = [...event.currentTarget.querySelectorAll<HTMLElement>(FOCUSABLE)]
  const first = focusables[0]
  const last = focusables[focusables.length - 1]
  if (!first || !last) {
    event.preventDefault()
    return
  }
  const active = document.activeElement
  if (event.shiftKey && (active === first || active === event.currentTarget)) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && active === last) {
    event.preventDefault()
    first.focus()
  }
}

/** Full-screen editor that frames a photo at the given ratio with pan, pinch, wheel, zoom and rotation. */
export function CropEditor({
  imageUrl,
  imageSize,
  frame,
  value,
  title,
  subtitle,
  shape = 'rect',
  allowRotate = true,
  confirmLabel = 'OK',
  onCancel,
  onConfirm,
}: CropEditorProps) {
  const [view, setView] = useState<CropView>(() =>
    value === null
      ? clampCropView(DEFAULT_CROP_VIEW, imageSize, frame)
      : cropViewFromRect(value, imageSize, frame),
  )
  const [stage, setStage] = useState<StageSize>({ width: 0, height: 0 })
  const [stageElement, setStageElement] = useState<HTMLElement | null>(null)
  const layerRef = useRef<HTMLDivElement>(null)
  const frameWidth = frameWidthFor(stage, frame.aspect)
  const { attachStage, attachFrame, ...pointerHandlers } = useCropGestures({
    view,
    imageSize,
    frame,
    viewportWidthPx: frameWidth,
    onChange: setView,
  })
  const rect = cropRectFromView(view, imageSize, frame)
  const maxZoom = maxCropZoom(imageSize, frame, view.rotate)
  const isCircle = shape === 'circle'
  const radius = isCircle ? 'rounded-full' : 'rounded-[14px]'

  useEffect(() => {
    if (!stageElement) return
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setStage({ width: entry.contentRect.width, height: entry.contentRect.height })
    })
    observer.observe(stageElement)
    return () => observer.disconnect()
  }, [stageElement])

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    layerRef.current?.focus()
    return () => previous?.focus()
  }, [])

  const stageRef = useCallback<RefCallback<HTMLElement>>(
    (node) => {
      attachStage(node)
      setStageElement(node)
    },
    [attachStage],
  )

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === 'Escape') {
      event.preventDefault()
      onCancel()
    } else if (event.key === 'Tab') {
      trapTab(event)
    }
  }

  const handleZoom = (zoom: number): void => {
    setView((current) =>
      zoomCropViewAt(
        current,
        { factor: zoom / current.zoom, focusX: 0.5, focusY: 0.5 },
        imageSize,
        frame,
      ),
    )
  }

  return createPortal(
    <div
      ref={layerRef}
      role="dialog"
      aria-modal="true"
      aria-label="Recadrer la photo"
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      className="fixed inset-0 z-50 flex flex-col overscroll-contain bg-board pt-[env(safe-area-inset-top)] text-ink outline-none"
    >
      <div className="grid flex-none grid-cols-[1fr_auto_1fr] items-center px-4 py-2">
        <button
          type="button"
          onClick={onCancel}
          className="cursor-pointer justify-self-start border-0 bg-transparent py-2 text-[15px] text-info"
        >
          Annuler
        </button>
        <div className="flex flex-col text-center font-display text-[15px] font-semibold">
          {title}
          {subtitle ? (
            <small className="font-sans text-[11px] font-normal text-faint">{subtitle}</small>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => onConfirm(cropRectOrNull(view, imageSize, frame))}
          className="cursor-pointer justify-self-end border-0 bg-transparent py-2 text-[15px] font-semibold text-info"
        >
          {confirmLabel}
        </button>
      </div>
      <div
        ref={stageRef}
        data-crop-stage=""
        {...pointerHandlers}
        className="relative grid min-h-0 flex-1 cursor-grab touch-none select-none place-items-center overflow-hidden active:cursor-grabbing"
      >
        <div
          ref={attachFrame}
          className="relative"
          style={{ width: frameWidth, aspectRatio: String(frame.aspect) }}
        >
          <CropLayer src={imageUrl} imageSize={imageSize} crop={rect} className="opacity-30" />
          <span className={`absolute inset-0 block overflow-hidden ${radius}`}>
            <CropLayer src={imageUrl} imageSize={imageSize} crop={rect} />
          </span>
          {isCircle ? (
            <span className="pointer-events-none absolute inset-0 block overflow-hidden">
              <span className="absolute inset-0 rounded-full shadow-[0_0_0_9999px_rgb(5_5_8/0.55)]" />
            </span>
          ) : null}
          <span
            aria-hidden="true"
            className={`pointer-events-none absolute inset-0 block shadow-[0_0_0_2px_var(--color-ink)] ${radius}`}
            style={{ backgroundImage: GRID_LINES }}
          />
        </div>
      </div>
      <div className="flex flex-none flex-col gap-2.5 bg-bg px-4 pt-3 pb-[max(20px,env(safe-area-inset-bottom))] shadow-[inset_0_1px_0_var(--color-line)]">
        <label className="flex items-center gap-3 text-[12px] text-muted">
          Zoom
          <input
            type="range"
            aria-label="Zoom"
            min={1}
            max={maxZoom}
            step={0.01}
            value={view.zoom}
            disabled={maxZoom <= 1}
            onChange={(event) => handleZoom(Number(event.currentTarget.value))}
            className="min-w-0 flex-1 accent-accent"
          />
        </label>
        <div className="flex gap-2.5">
          {allowRotate ? (
            <Button
              variant="ghost"
              className="!h-10 flex-1 !text-sm"
              onClick={() => setView((current) => rotateCropView(current))}
            >
              <Icon name="rotate" className="size-4" />
              Pivoter
            </Button>
          ) : null}
          <Button
            variant="ghost"
            className="!h-10 flex-1 !text-sm"
            disabled={isDefaultCropView(view)}
            onClick={() => setView(clampCropView(DEFAULT_CROP_VIEW, imageSize, frame))}
          >
            Réinitialiser
          </Button>
        </div>
        <p className="m-0 text-center text-[12px] text-faint">
          Pince pour zoomer, glisse pour cadrer. Sans retouche, la photo est centrée automatiquement.
        </p>
      </div>
    </div>,
    document.body,
  )
}
