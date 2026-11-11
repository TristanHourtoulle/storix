import { useEffect, useRef } from 'react'
import { SHOP_CATEGORIES, type ShopCategorySlug } from '../shop-categories'

interface ShopCategoryChipsProps {
  active: ShopCategorySlug
  onSelect: (slug: ShopCategorySlug) => void
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** The row of shop categories; the active one is filled and kept in view. */
export function ShopCategoryChips({ active, onSelect }: ShopCategoryChipsProps) {
  const activeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    activeRef.current?.scrollIntoView({
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      block: 'nearest',
      inline: 'nearest',
    })
  }, [active])

  return (
    <div className="shop-seg" role="group" aria-label="Catégories">
      {SHOP_CATEGORIES.map((category) => (
        <button
          key={category.slug}
          ref={category.slug === active ? activeRef : undefined}
          type="button"
          aria-pressed={category.slug === active}
          onClick={() => onSelect(category.slug)}
        >
          {category.chip}
        </button>
      ))}
    </div>
  )
}
