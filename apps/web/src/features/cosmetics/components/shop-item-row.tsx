import { ORIGINAL_ROW_HINT, SLOT_ROW_HINT } from '../shop-copy'
import type { OptionState, ShopOption } from '../shop-options'
import { ItemThumb } from './item-thumb'
import { OptionStatus } from './option-status'

interface ShopItemRowContentProps {
  option: ShopOption
  state: OptionState
}

/** Thumbnail, name, hint and status of a theme, shared by the catalogue and Mon style. */
export function ShopItemRowContent({ option, state }: ShopItemRowContentProps) {
  return (
    <>
      <span className="shop-row-thumb">
        <ItemThumb slot={option.slot} itemId={option.itemId} variant="row" />
      </span>
      <span className="shop-row-text">
        <b>{option.name}</b>
        <small>{option.itemId === null ? ORIGINAL_ROW_HINT : SLOT_ROW_HINT[option.slot]}</small>
      </span>
      <OptionStatus option={option} state={state} />
    </>
  )
}

/** Class names of a theme row, for links and buttons alike. */
export function shopRowClassName(isOn = false): string {
  return isOn ? 'shop-row is-on' : 'shop-row'
}
