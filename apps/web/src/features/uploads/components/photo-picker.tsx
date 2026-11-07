import { useRef, type ChangeEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'

interface PhotoPickerProps {
  variant: 'button' | 'tile'
  isDisabled?: boolean
  onPick: (files: File[]) => void
}

export function PhotoPicker({ variant, isDisabled = false, onPick }: PhotoPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const files = Array.from(event.currentTarget.files ?? [])
    event.currentTarget.value = ''
    if (files.length > 0) onPick(files)
  }

  const open = (): void => inputRef.current?.click()

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        tabIndex={-1}
        onChange={handleChange}
      />
      {variant === 'button' ? (
        <Button variant="primary" block disabled={isDisabled} onClick={open}>
          Choisir des photos
        </Button>
      ) : (
        <button
          type="button"
          aria-label="Ajouter des photos"
          disabled={isDisabled}
          onClick={open}
          className="grid aspect-square cursor-pointer appearance-none place-items-center rounded-thumb border-0 bg-surface p-0 text-muted shadow-hairline disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Icon name="plus" />
        </button>
      )}
    </>
  )
}
