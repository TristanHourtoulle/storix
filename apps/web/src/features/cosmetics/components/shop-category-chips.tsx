import { SHOP_CATEGORIES, type ShopCategorySlug } from '../shop-categories'

interface ShopCategoryChipsProps {
  active: ShopCategorySlug
  onSelect: (slug: ShopCategorySlug) => void
}

/** The row of shop categories; the active one is filled. */
export function ShopCategoryChips({ active, onSelect }: ShopCategoryChipsProps) {
  return (
    <div className="shop-seg" role="group" aria-label="Catégories">
      {SHOP_CATEGORIES.map((category) => (
        <button
          key={category.slug}
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
