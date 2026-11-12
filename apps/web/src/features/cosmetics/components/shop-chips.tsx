import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import { categoryItemCount, type ShopCategory, type ShopCategorySlug } from '../shop-categories'

interface ShopChipsProps {
  categories: readonly ShopCategory[]
  active: ShopCategorySlug | null
  onSelect: (slug: ShopCategorySlug) => void
  hasCounts?: boolean
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

/** The counted categories of a family; the violet indicator slides to the active one, kept in view. */
export function ShopChips({ categories, active, onSelect, hasCounts = true }: ShopChipsProps) {
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
  }, [active, categories, measure])

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
  }, [categories, measure])

  useLayoutEffect(() => {
    if (box === null || isPlaced) return
    const frame = requestAnimationFrame(() => setIsPlaced(true))
    return () => cancelAnimationFrame(frame)
  }, [box, isPlaced])

  const indicator =
    box === null
      ? undefined
      : ({ width: box.width, transform: `translateX(${box.left}px)` } as CSSProperties)

  return (
    <div ref={rowRef} className="chip-row" role="group" aria-label="Catégories">
      {box === null ? null : (
        <span
          className={`chip-indicator${isPlaced ? ' is-placed' : ''}`}
          style={indicator}
          aria-hidden="true"
        />
      )}
      {categories.map((category) => (
        <button
          key={category.slug}
          type="button"
          className="chip"
          aria-pressed={category.slug === active}
          onClick={() => onSelect(category.slug)}
        >
          <span className="chip-label">
            {category.chip}
            {hasCounts ? <span className="n">{categoryItemCount(category)}</span> : null}
          </span>
        </button>
      ))}
    </div>
  )
}
