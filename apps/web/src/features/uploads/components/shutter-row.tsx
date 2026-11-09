import { useRef, type ChangeEvent } from 'react'
import { Icon } from '@/components/ui/icon'
import { CAMERA_COPY } from '../camera/camera-copy'

export type ShutterMode = 'live' | 'enable' | 'native' | 'waiting'

interface ShutterRowProps {
  isDisabled: boolean
  mode: ShutterMode
  onShutter: () => void
  onPick: (files: File[]) => void
  flip: { isVisible: boolean; onFlip: () => void }
}

const SIDE_BUTTON =
  'flex cursor-pointer appearance-none flex-col items-center gap-1 justify-self-center border-0 bg-transparent p-0 text-[11px] font-medium text-ink-2 disabled:cursor-not-allowed disabled:opacity-35'
const SIDE_TILE = 'grid size-[46px] place-items-center rounded-control bg-surface shadow-hairline'

function pickedFiles(event: ChangeEvent<HTMLInputElement>): File[] {
  const files = Array.from(event.currentTarget.files ?? [])
  event.currentTarget.value = ''
  return files
}

/** The Galerie button, the shutter and the flip tile; the shutter falls back to the native camera input. */
export function ShutterRow({ isDisabled, mode, onShutter, onPick, flip }: ShutterRowProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const files = pickedFiles(event)
    if (files.length > 0) onPick(files)
  }

  const handleShutter = (): void => {
    if (mode === 'native') cameraInputRef.current?.click()
    else if (mode === 'live' || mode === 'enable') onShutter()
  }

  return (
    <div className="grid w-full grid-cols-[1fr_auto_1fr] items-center px-[18px]">
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        tabIndex={-1}
        onChange={handleChange}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        tabIndex={-1}
        onChange={handleChange}
      />
      <button
        type="button"
        disabled={isDisabled}
        onClick={() => galleryInputRef.current?.click()}
        className={SIDE_BUTTON}
      >
        <span className={SIDE_TILE}>
          <Icon name="photo" className="size-5" />
        </span>
        Galerie
      </button>
      <button
        type="button"
        aria-label="Prendre une photo"
        disabled={isDisabled || mode === 'waiting'}
        onClick={handleShutter}
        className="grid size-[78px] cursor-pointer appearance-none place-items-center rounded-full border-0 bg-ink p-0 text-bg shadow-[0_0_0_4px_var(--color-bg),0_0_0_7px_var(--color-ink)] disabled:cursor-not-allowed disabled:opacity-35"
      >
        <Icon name="camera" className="size-7" />
      </button>
      {flip.isVisible ? (
        <button
          type="button"
          aria-label={CAMERA_COPY.flipLabel}
          onClick={flip.onFlip}
          className={SIDE_BUTTON}
        >
          <span className={SIDE_TILE}>
            <Icon name="flip" className="size-5" />
          </span>
          {CAMERA_COPY.flip}
        </button>
      ) : (
        <span />
      )}
    </div>
  )
}
