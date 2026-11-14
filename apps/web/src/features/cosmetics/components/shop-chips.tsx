import { useMemo } from 'react'
import { ChipRow } from '@/components/ui/chip-row'
import { categoryItemCount, type ShopCategory, type ShopCategorySlug } from '../shop-categories'

interface ShopChipsProps {
  categories: readonly ShopCategory[]
  active: ShopCategorySlug | null
  onSelect: (slug: ShopCategorySlug) => void
  hasCounts?: boolean
}

const announceCategory = (label: string) => `Catégorie ${label}`

/** The counted categories of a family; the violet indicator slides to the active one, kept in view. */
export function ShopChips({ categories, active, onSelect, hasCounts = true }: ShopChipsProps) {
  const options = useMemo(
    () =>
      categories.map((category) => ({
        id: category.slug,
        label: category.chip,
        ...(hasCounts ? { count: categoryItemCount(category) } : {}),
      })),
    [categories, hasCounts],
  )
  return (
    <ChipRow
      options={options}
      active={active}
      onSelect={onSelect}
      label="Catégories"
      announce={announceCategory}
    />
  )
}
