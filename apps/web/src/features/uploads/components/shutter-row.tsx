import { useRef, type ChangeEvent } from 'react'
import { Icon } from '@/components/ui/icon'

interface ShutterRowProps {
  isDisabled: boolean
  onPick: (files: File[]) => void
}

function pickedFiles(event: ChangeEvent<HTMLInputElement>): File[] {
  const files = Array.from(event.currentTarget.files ?? [])
  event.currentTarget.value = ''
  return files
}

/** The Galerie button and the shutter; both only add to the strip. */
export function ShutterRow({ isDisabled, onPick }: ShutterRowProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const files = pickedFiles(event)
    if (files.length > 0) onPick(files)
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
        className="flex cursor-pointer appearance-none flex-col items-center gap-1 justify-self-center border-0 bg-transparent p-0 text-[11px] font-medium text-ink-2 disabled:cursor-not-allowed disabled:opacity-35"
      >
        <span className="grid size-[46px] place-items-center rounded-control bg-surface shadow-hairline">
          <Icon name="photo" className="size-5" />
        </span>
        Galerie
      </button>
      <button
        type="button"
        aria-label="Prendre une photo"
        disabled={isDisabled}
        onClick={() => cameraInputRef.current?.click()}
        className="grid size-[78px] cursor-pointer appearance-none place-items-center rounded-full border-0 bg-ink p-0 text-bg shadow-[0_0_0_4px_var(--color-bg),0_0_0_7px_var(--color-ink)] disabled:cursor-not-allowed disabled:opacity-35"
      >
        <Icon name="camera" className="size-7" />
      </button>
      <span />
    </div>
  )
}
