import type { CSSProperties } from 'react'

export interface SegmentedControlOption<T extends string> {
  id: T
  label: string
}

interface SegmentedControlProps<T extends string> {
  options: readonly SegmentedControlOption<T>[]
  value: T
  onChange: (id: T) => void
  label: string
  className?: string
}

/**
 * Full-width pill segmented control (ported from Freelance Manager): equal segments, the active one
 * marked by a pill that slides between them.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  className = '',
}: SegmentedControlProps<T>) {
  const activeIndex = Math.max(
    0,
    options.findIndex((option) => option.id === value),
  )
  const style = { '--seg-n': options.length, '--seg-i': activeIndex } as CSSProperties

  return (
    <div className={`seg ${className}`.trim()} role="group" aria-label={label} style={style}>
      <span className="seg-pill" aria-hidden="true" />
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          className={option.id === value ? 'active' : undefined}
          aria-pressed={option.id === value}
          onClick={() => onChange(option.id)}
        >
          <span>{option.label}</span>
        </button>
      ))}
    </div>
  )
}
