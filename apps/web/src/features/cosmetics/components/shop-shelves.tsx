import { useId, type ReactNode } from 'react'
import { SegmentedControl, segmentPanelId, segmentTabId } from '@/components/ui/segmented-control'
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
  bonus: ReactNode
  children: (category: ShopCategorySlug) => ReactNode
}

export const FAMILY_OPTIONS = SHOP_FAMILIES.map((family) => ({
  id: family.slug,
  label: family.label,
}))

/**
 * The shop's three families (Cartes, Profil and the porte-bonheur Bonus) with their counted
 * categories; switching slides the active pill, the chip indicator and the content in the direction
 * of travel.
 */
export function ShopShelves({
  shelf,
  onChange,
  hasCounts = true,
  bonus,
  children,
}: ShopShelvesProps) {
  const family = shopFamily(shelf.family)
  const category =
    family.categories.find((item) => item.slug === shelf.category)?.slug ??
    family.categories[0]?.slug ??
    null
  const direction = useTravelDirection(categoryOrder(category))
  const idBase = useId()

  return (
    <>
      <SegmentedControl
        label="Familles"
        idBase={idBase}
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
      <div
        key={category ?? shelf.family}
        id={segmentPanelId(idBase)}
        role="tabpanel"
        aria-labelledby={segmentTabId(idBase, shelf.family)}
        className={`shop-pane ${direction}`}
      >
        {category === null ? bonus : children(category)}
      </div>
    </>
  )
}
