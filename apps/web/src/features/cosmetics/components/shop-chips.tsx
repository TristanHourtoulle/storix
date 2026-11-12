import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
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

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** The counted categories of a family; the violet indicator slides to the active one, kept in view. */
export function ShopChips({ categories, active, onSelect, hasCounts = true }: ShopChipsProps) {
  const rowRef = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState<IndicatorBox | null>(null)
  const [isPlaced, setIsPlaced] = useState(false)

  useLayoutEffect(() => {
    const row = rowRef.current
    const chip = row?.querySelector<HTMLButtonElement>('button[aria-pressed="true"]')
    if (!row || !chip) {
      setBox(null)
      return
    }
    setBox({ left: chip.offsetLeft, width: chip.offsetWidth })
    chip.scrollIntoView({
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      block: 'nearest',
      inline: 'nearest',
    })
  }, [active, categories])

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
