import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react'

export interface ChipOption<T extends string> {
  id: T
  label: string
  count?: number
}

interface ChipRowProps<T extends string> {
  options: readonly ChipOption<T>[]
  active: T | null
  onSelect: (id: T) => void
  label: string
  announce: (label: string) => string
}

interface IndicatorBox {
  left: number
  width: number
}

const SCROLL_PADDING = 16

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function activeChip(row: HTMLElement): HTMLButtonElement | null {
  return row.querySelector<HTMLButtonElement>('button[aria-pressed="true"]')
}

/** The horizontal scroll that brings the chip fully into the row, or null when it already is. */
function scrollLeftFor(row: HTMLElement, chip: HTMLElement): number | null {
  const chipEnd = chip.offsetLeft + chip.offsetWidth
  if (chip.offsetLeft < row.scrollLeft) return Math.max(0, chip.offsetLeft - SCROLL_PADDING)
  if (chipEnd > row.scrollLeft + row.clientWidth) {
    return chipEnd - row.clientWidth + SCROLL_PADDING
  }
  return null
}

/** A scrolling row of chips; the violet indicator slides to the active one, kept in view. */
export function ChipRow<T extends string>({
  options,
  active,
  onSelect,
  label,
  announce,
}: ChipRowProps<T>) {
  const rowRef = useRef<HTMLDivElement>(null)
  const hasMountedRef = useRef(false)
  const [box, setBox] = useState<IndicatorBox | null>(null)
  const [isPlaced, setIsPlaced] = useState(false)

  const measure = useCallback(() => {
    const row = rowRef.current
    const chip = row ? activeChip(row) : null
    setBox(chip ? { left: chip.offsetLeft, width: chip.offsetWidth } : null)
  }, [])

  useLayoutEffect(() => {
    measure()
    const row = rowRef.current
    const chip = row ? activeChip(row) : null
    if (!hasMountedRef.current) {
      hasMountedRef.current = true
      return
    }
    if (!row || !chip) return
    const left = scrollLeftFor(row, chip)
    if (left !== null) {
      row.scrollTo({ left, behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
    }
  }, [active, options, measure])

  useEffect(() => {
    const row = rowRef.current
    if (!row) return
    let isLive = true
    const observer = new ResizeObserver(() => measure())
    observer.observe(row)
    row.querySelectorAll('button').forEach((chip) => observer.observe(chip))
    void document.fonts.ready.then(() => {
      if (isLive) measure()
    })
    return () => {
      isLive = false
      observer.disconnect()
    }
  }, [options, measure])

  useLayoutEffect(() => {
    if (box === null || isPlaced) return
    const frame = requestAnimationFrame(() => setIsPlaced(true))
    return () => cancelAnimationFrame(frame)
  }, [box, isPlaced])

  const activeLabel = options.find((option) => option.id === active)?.label ?? null
  const indicator =
    box === null
      ? undefined
      : ({ width: box.width, transform: `translateX(${box.left}px)` } as CSSProperties)

  return (
    <div ref={rowRef} className="chip-row" role="group" aria-label={label}>
      {box === null ? null : (
        <span
          className={`chip-indicator${isPlaced ? ' is-placed' : ''}`}
          style={indicator}
          aria-hidden="true"
        />
      )}
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          className="chip"
          aria-pressed={option.id === active}
          onClick={() => onSelect(option.id)}
        >
          <span className="chip-label">
            {option.label}
            {option.count === undefined ? null : <span className="n">{option.count}</span>}
          </span>
        </button>
      ))}
      <span className="sr-only" aria-live="polite">
        {activeLabel === null ? '' : announce(activeLabel)}
      </span>
    </div>
  )
}
