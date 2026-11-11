import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import type { CosmeticSlot } from '@storix/shared'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { myCosmeticsQueryOptions } from '../cosmetics.queries'
import { categoryOfSlot } from '../shop-categories'
import { SLOT_TITLE } from '../shop-copy'
import { optionState, wearableOptions } from '../shop-options'
import { useEquipCosmetic } from '../use-equip-cosmetic'
import { ShopItemRowContent, shopRowClassName } from './shop-item-row'

interface StyleSlotSheetProps {
  leagueId: string
  slot: CosmeticSlot | null
  onClose: () => void
}

/** Lists what the viewer can wear in a slot, the original style and every owned theme, and wears the tapped one. */
export function StyleSlotSheet({ leagueId, slot, onClose }: StyleSlotSheetProps) {
  return (
    <BottomSheet open={slot !== null} title={slot ? SLOT_TITLE[slot] : ''} onClose={onClose}>
      {slot ? <StyleSlotList leagueId={leagueId} slot={slot} onClose={onClose} /> : null}
    </BottomSheet>
  )
}

interface StyleSlotListProps {
  leagueId: string
  slot: CosmeticSlot
  onClose: () => void
}

function StyleSlotList({ leagueId, slot, onClose }: StyleSlotListProps) {
  const mine = useQuery(myCosmeticsQueryOptions).data
  const { equip, isPending, errorMessage } = useEquipCosmetic()

  return (
    <>
      <ul className="shop-list">
        {wearableOptions(slot, mine).map((option) => {
          const state = optionState(option, mine)
          return (
            <li key={option.itemId ?? 'original'}>
              <button
                type="button"
                className={shopRowClassName(state === 'worn')}
                aria-pressed={state === 'worn'}
                disabled={isPending}
                onClick={() =>
                  state === 'worn' ? onClose() : equip({ slot, itemId: option.itemId }, onClose)
                }
              >
                <ShopItemRowContent option={option} state={state} />
              </button>
            </li>
          )
        })}
      </ul>
      {errorMessage ? (
        <p role="alert" className="m-0 text-sm text-danger">
          {errorMessage}
        </p>
      ) : null}
      <div className="bsheet-footer">
        <Link
          to="/l/$leagueId/shop"
          params={{ leagueId }}
          search={{ category: categoryOfSlot(slot).slug }}
          className="shop-btn is-ghost no-underline"
        >
          Voir la Boutique
        </Link>
      </div>
    </>
  )
}
