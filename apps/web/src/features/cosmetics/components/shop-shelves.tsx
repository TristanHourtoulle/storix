import type { ReactNode } from 'react'
import { SegmentedControl } from '@/components/ui/segmented-control'
import {
  SHOP_FAMILIES,
  categoryOrder,
  shopFamily,
  type ShopCategorySlug,
  type ShopFamilySlug,
} from '../shop-categories'
import { useTravelDirection } from '../use-travel-direction'
import { ShopChips } from './shop-chips'

export interface ShopShelf {
  family: ShopFamilySlug
  category: ShopCategorySlug | null
}

interface ShopShelvesProps {
  shelf: ShopShelf
  onChange: (shelf: ShopShelf) => void
  hasCounts?: boolean
  children: (category: ShopCategorySlug) => ReactNode
}

export const FAMILY_OPTIONS = SHOP_FAMILIES.map((family) => ({
  id: family.slug,
  label: family.label,
}))

/** Placeholder for the Sons & partage family until its first cosmetics ship. */
export function ShopComingSoon() {
  return (
    <div className="shop-soon">
      <span className="shop-soon-ico" aria-hidden="true">
        ♪
      </span>
      <b>Sons & partage</b>
      <p>
        Des packs de sons pour tes ouvertures et des styles de partage exclusifs arrivent bientôt.
      </p>
      <small>Bientôt</small>
    </div>
  )
}

/**
 * The shop's three families with their counted categories; switching slides the active pill, the
 * chip indicator and the content in the direction of travel.
 */
export function ShopShelves({ shelf, onChange, hasCounts = true, children }: ShopShelvesProps) {
  const family = shopFamily(shelf.family)
  const category =
    family.categories.find((item) => item.slug === shelf.category)?.slug ??
    family.categories[0]?.slug ??
    null
  const direction = useTravelDirection(categoryOrder(category))

  return (
    <>
      <SegmentedControl
        label="Familles"
        options={FAMILY_OPTIONS}
        value={shelf.family}
        onChange={(slug) =>
          onChange({ family: slug, category: shopFamily(slug).categories[0]?.slug ?? null })
        }
      />
      {family.categories.length > 0 ? (
        <ShopChips
          categories={family.categories}
          active={category}
          hasCounts={hasCounts}
          onSelect={(slug) => onChange({ family: shelf.family, category: slug })}
        />
      ) : null}
      <div key={category ?? 'soon'} className={`shop-pane ${direction}`}>
        {category === null ? <ShopComingSoon /> : children(category)}
      </div>
    </>
  )
}
