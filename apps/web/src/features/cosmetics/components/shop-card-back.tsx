import { CardBackArt } from '@/features/boosters/components/arcade-card'
import { cardBackClass } from '../cosmetic-skins'
import { useEquippedStyle } from '../style-context'
import '@/styles/booster-card.css'
import '@/styles/cosmetics-arcade.css'

export const CARD_BACK_WIDTH = 220
export const CARD_BACK_HEIGHT = 308

/** The worn card back at the size it has during a booster opening. */
export function ShopCardBack() {
  const skin = cardBackClass(useEquippedStyle().cardBack)
  return (
    <div className="shop-back" aria-hidden="true">
      <div className={`ar-face ar-back${skin ? ` ${skin}` : ''}`}>
        <CardBackArt />
      </div>
    </div>
  )
}
