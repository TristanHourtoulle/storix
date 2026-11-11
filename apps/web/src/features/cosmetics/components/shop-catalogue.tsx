import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { DustBalance } from '@/features/game/components/dust-balance'
import { useWallet } from '@/features/game/use-wallet'
import { myCosmeticsQueryOptions } from '../cosmetics.queries'
import { shopCategory, type ShopCategorySlug } from '../shop-categories'
import { optionState, slotOptions } from '../shop-options'
import { ShopCategoryChips } from './shop-category-chips'
import { ShopItemRowContent, shopRowClassName } from './shop-item-row'

interface ShopCatalogueProps {
  leagueId: string
  category: ShopCategorySlug
  onCategoryChange: (slug: ShopCategorySlug) => void
}

/** The shop: the league balance, the categories and one row per theme with its status. */
export function ShopCatalogue({ leagueId, category, onCategoryChange }: ShopCatalogueProps) {
  const mine = useQuery(myCosmeticsQueryOptions).data
  const dust = useWallet(leagueId).data?.dust
  const { slot } = shopCategory(category)

  return (
    <main className="screen gap-3.5">
      <div className="shop-top">
        <h1 className="shop-title">Boutique</h1>
        <DustBalance dust={dust} />
      </div>
      <ShopCategoryChips active={category} onSelect={onCategoryChange} />
      <ul className="shop-list">
        {slotOptions(slot).map((option) => (
          <li key={option.itemId ?? 'original'}>
            <Link
              to="/l/$leagueId/shop/try/$category"
              params={{ leagueId, category }}
              search={option.itemId === null ? {} : { item: option.itemId }}
              className={shopRowClassName()}
            >
              <ShopItemRowContent option={option} state={optionState(option, mine)} />
            </Link>
          </li>
        ))}
      </ul>
    </main>
  )
}
