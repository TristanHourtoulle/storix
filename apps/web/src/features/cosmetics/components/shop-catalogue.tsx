import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { DustBalance } from '@/features/game/components/dust-balance'
import { useWallet } from '@/features/game/use-wallet'
import { myCosmeticsQueryOptions } from '../cosmetics.queries'
import { shopCategory } from '../shop-categories'
import { optionState, slotOptions } from '../shop-options'
import { ShopItemRowContent, shopRowClassName } from './shop-item-row'
import { ShopShelves, type ShopShelf } from './shop-shelves'

interface ShopCatalogueProps {
  leagueId: string
  shelf: ShopShelf
  onShelfChange: (shelf: ShopShelf) => void
}

/** The shop: the league balance, the families and their categories, one row per theme with its status. */
export function ShopCatalogue({ leagueId, shelf, onShelfChange }: ShopCatalogueProps) {
  const mine = useQuery(myCosmeticsQueryOptions).data
  const dust = useWallet(leagueId).data?.dust

  return (
    <main className="screen gap-3.5">
      <div className="shop-top">
        <h1 className="shop-title">Boutique</h1>
        <DustBalance dust={dust} />
      </div>
      <ShopShelves shelf={shelf} onChange={onShelfChange}>
        {(category) => (
          <ul className="shop-list">
            {slotOptions(shopCategory(category).slot).map((option) => (
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
        )}
      </ShopShelves>
    </main>
  )
}
