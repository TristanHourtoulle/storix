import { useState } from 'react'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { showToast } from '@/components/ui/toast'
import { useWallet } from '@/features/game/use-wallet'
import { useMyLeagues } from '@/features/leagues/use-my-leagues'
import { cosmeticFullName, formatDustPrice } from '../cosmetic-copy'
import { purchaseQuestion } from '../shop-copy'
import type { ShopOption } from '../shop-options'
import { usePurchaseCosmetic } from '../use-purchase-cosmetic'
import { ItemThumb } from './item-thumb'

interface PurchaseSheetProps {
  leagueId: string
  option: ShopOption | null
  onClose: () => void
}

/** Confirms a purchase: a recap, whether to wear it now, the price and the balance left in the league. */
export function PurchaseSheet({ leagueId, option, onClose }: PurchaseSheetProps) {
  return (
    <BottomSheet
      open={option !== null}
      title={option ? purchaseQuestion(option.slot, option.name) : ''}
      onClose={onClose}
    >
      {option?.item ? (
        <PurchaseSheetBody
          key={option.item.id}
          leagueId={leagueId}
          option={option}
          onClose={onClose}
        />
      ) : null}
    </BottomSheet>
  )
}

interface PurchaseSheetBodyProps {
  leagueId: string
  option: ShopOption
  onClose: () => void
}

function PurchaseSheetBody({ leagueId, option, onClose }: PurchaseSheetBodyProps) {
  const [shouldWear, setShouldWear] = useState(true)
  const dust = useWallet(leagueId).data?.dust
  const leagueName = useMyLeagues().find((league) => league.id === leagueId)?.name ?? 'la ligue'
  const { purchase, isPending, errorMessage } = usePurchaseCosmetic(leagueId)
  const item = option.item
  if (item === null) return null
  const left = dust === undefined ? null : dust - item.price
  const isShort = left !== null && left < 0

  function buy() {
    if (item === null) return
    purchase({ itemId: item.id, equip: shouldWear }, () => {
      showToast(`Achat réussi : ${cosmeticFullName(item)}.`)
      onClose()
    })
  }

  return (
    <>
      <div className="shop-sheet-preview">
        <ItemThumb slot={option.slot} itemId={item.id} variant="sheet" />
      </div>
      <div className="shop-switch-row">
        <span className="shop-row-text">
          <b id="shop-wear-label">Porter tout de suite</b>
          <small>Tu peux changer dans Profil › Mon style</small>
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={shouldWear}
          aria-labelledby="shop-wear-label"
          className="shop-switch"
          onClick={() => setShouldWear((value) => !value)}
        />
      </div>
      {errorMessage ? (
        <p role="alert" className="m-0 text-sm text-danger">
          {errorMessage}
        </p>
      ) : null}
      <button
        type="button"
        className="shop-btn"
        disabled={isPending || isShort || dust === undefined}
        aria-busy={isPending}
        onClick={buy}
      >
        {isPending ? 'Achat…' : `Acheter · ${formatDustPrice(item.price)}`}
      </button>
      {left === null ? null : (
        <p className={isShort ? 'shop-left is-short' : 'shop-left'}>
          {isShort
            ? `Il te manque ${formatDustPrice(-left)} dans ${leagueName}.`
            : `Il te restera ${formatDustPrice(left)} dans ${leagueName}`}
        </p>
      )}
    </>
  )
}
