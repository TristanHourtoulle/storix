import { useRef, type CSSProperties, type KeyboardEvent } from 'react'

export interface SegmentedControlOption<T extends string> {
  id: T
  label: string
}

interface SegmentedControlProps<T extends string> {
  options: readonly SegmentedControlOption<T>[]
  value: T
  onChange: (id: T) => void
  label: string
  idBase: string
  className?: string
}

/** The id of a segment's tab, for the panel's `aria-labelledby`. */
export function segmentTabId(idBase: string, id: string): string {
  return `${idBase}-tab-${id}`
}

/** The id of the panel the segments control. */
export function segmentPanelId(idBase: string): string {
  return `${idBase}-panel`
}

/** The index a tablist key moves to, or null for keys it does not handle. */
function nextIndex(key: string, index: number, count: number): number | null {
  if (key === 'ArrowRight') return (index + 1) % count
  if (key === 'ArrowLeft') return (index - 1 + count) % count
  if (key === 'Home') return 0
  if (key === 'End') return count - 1
  return null
}

/**
 * Full-width pill segmented control (ported from Freelance Manager): equal segments, the active one
 * marked by a pill that slides between them. A tablist: arrows, Home and End move the selection.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  idBase,
  className = '',
}: SegmentedControlProps<T>) {
  const listRef = useRef<HTMLDivElement>(null)
  const activeIndex = Math.max(
    0,
    options.findIndex((option) => option.id === value),
  )
  const style = { '--seg-n': options.length, '--seg-i': activeIndex } as CSSProperties

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const target = nextIndex(event.key, activeIndex, options.length)
    const option = target === null ? undefined : options[target]
    if (target === null || option === undefined) return
    event.preventDefault()
    onChange(option.id)
    listRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[target]?.focus()
  }

  return (
    <div
      ref={listRef}
      className={`seg ${className}`.trim()}
      role="tablist"
      aria-label={label}
      style={style}
      onKeyDown={onKeyDown}
    >
      <span className="seg-pill" aria-hidden="true" />
      {options.map((option) => {
        const isActive = option.id === value
        return (
          <button
            key={option.id}
            id={segmentTabId(idBase, option.id)}
            type="button"
            role="tab"
            className={isActive ? 'active' : undefined}
            aria-selected={isActive}
            aria-controls={segmentPanelId(idBase)}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(option.id)}
          >
            <span>{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}
