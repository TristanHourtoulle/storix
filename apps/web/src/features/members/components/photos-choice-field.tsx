import { useId } from 'react'
import type { PhotosChoice } from '@storix/shared'

export interface PhotosChoiceOption {
  value: PhotosChoice
  label: string
  description: string
}

interface PhotosChoiceFieldProps {
  legend: string
  options: readonly PhotosChoiceOption[]
  value: PhotosChoice | null
  onChange: (value: PhotosChoice) => void
  isDisabled?: boolean
}

export function PhotosChoiceField({
  legend,
  options,
  value,
  onChange,
  isDisabled = false,
}: PhotosChoiceFieldProps) {
  const name = useId()

  return (
    <fieldset disabled={isDisabled} className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
      <legend className="mb-2 p-0 text-xs uppercase tracking-[0.06em] text-muted">{legend}</legend>
      {options.map((option) => {
        const isSelected = value === option.value
        return (
          <label
            key={option.value}
            className={`flex cursor-pointer items-start gap-3 rounded-input bg-surface-2 p-3 ${isSelected ? 'ring-2 ring-accent' : 'shadow-hairline'}`}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={isSelected}
              onChange={() => onChange(option.value)}
              className="mt-0.5 size-4 flex-none accent-accent"
            />
            <span className="flex min-w-0 flex-col gap-1">
              <span className="text-sm font-semibold">{option.label}</span>
              <span className="text-[13px] leading-snug text-muted">{option.description}</span>
            </span>
          </label>
        )
      })}
    </fieldset>
  )
}
