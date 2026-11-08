import { useCallback, useEffect, useState, type KeyboardEvent, type RefCallback } from 'react'
import { createPortal } from 'react-dom'
import {
  DEFAULT_CROP_VIEW,
  clampCropView,
  cropRectFromView,
  cropRectOrNull,
  cropViewFromRect,
  isDefaultCropView,
  maxCropZoom,
  panCropView,
  rotateCropView,
  zoomCropViewAt,
  type CropFrame,
  type CropRect,
  type CropView,
  type ImageSize,
} from '@storix/shared/domain'
import { CropControls } from './crop-controls'
import { CropLayer } from './cropped-image'
import { useCropGestures } from './use-crop-gestures'
import { useModalLayer } from './use-modal-layer'

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
const KEY_PAN_PX = 16
const KEY_PAN: Readonly<Record<string, readonly [number, number]>> = {
  ArrowLeft: [-KEY_PAN_PX, 0],
  ArrowRight: [KEY_PAN_PX, 0],
  ArrowUp: [0, -KEY_PAN_PX],
  ArrowDown: [0, KEY_PAN_PX],
}
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
  const { container, layerRef, refocus } = useModalLayer(onCancel)
  const frameWidth = frameWidthFor(stage, frame.aspect)
  const { attachStage, attachFrame, ...pointerHandlers } = useCropGestures({
    view,
    imageSize,
    frame,
    viewportWidthPx: frameWidth,
    onChange: setView,
  })
  const rect = cropRectFromView(view, imageSize, frame)
  const radius = shape === 'circle' ? 'rounded-full' : 'rounded-[14px]'

  useEffect(() => {
    if (!stageElement) return
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setStage({ width: entry.contentRect.width, height: entry.contentRect.height })
    })
    observer.observe(stageElement)
    return () => observer.disconnect()
  }, [stageElement])

  const stageRef = useCallback<RefCallback<HTMLElement>>(
    (node) => {
      attachStage(node)
      setStageElement(node)
    },
    [attachStage],
  )

  const handleStageKey = (event: KeyboardEvent<HTMLDivElement>): void => {
    const step = KEY_PAN[event.key]
    if (!step) return
    event.preventDefault()
    setView((current) =>
      panCropView(
        current,
        { dxPx: step[0], dyPx: step[1], viewportWidthPx: frameWidth },
        imageSize,
        frame,
      ),
    )
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

  const handleReset = (): void => {
    setView(clampCropView(DEFAULT_CROP_VIEW, imageSize, frame))
    refocus()
  }

  return createPortal(
    <div
      ref={layerRef}
      role="dialog"
      aria-modal="true"
      aria-label="Recadrer la photo"
      tabIndex={-1}
      onKeyDown={(event) => event.stopPropagation()}
      className="fixed inset-0 z-50 flex flex-col overscroll-contain bg-board pt-[env(safe-area-inset-top)] text-ink outline-none"
    >
      <div className="grid flex-none touch-none grid-cols-[1fr_auto_1fr] items-center px-4 py-2">
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
        tabIndex={0}
        aria-label="Zone de cadrage"
        onKeyDown={handleStageKey}
        {...pointerHandlers}
        className="relative grid min-h-0 flex-1 cursor-grab touch-none select-none place-items-center overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset active:cursor-grabbing"
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
          {shape === 'circle' ? (
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
      <CropControls
        zoom={view.zoom}
        maxZoom={maxCropZoom(imageSize, frame, view.rotate)}
        allowRotate={allowRotate}
        isDefault={isDefaultCropView(view)}
        onZoom={handleZoom}
        onRotate={() => setView((current) => rotateCropView(current))}
        onReset={handleReset}
      />
    </div>,
    container,
  )
}
