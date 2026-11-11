import type { OptionState, ShopOption } from '../shop-options'

const NUMBER_FORMAT = new Intl.NumberFormat('fr-FR')

interface OptionStatusProps {
  option: ShopOption
  state: OptionState
}

/** What a theme is for the viewer: worn, owned, or its price. */
export function OptionStatus({ option, state }: OptionStatusProps) {
  if (state === 'worn') return <span className="shop-worn">Porté</span>
  if (state === 'owned') return <span className="shop-price is-owned">Acquis</span>
  const price = option.item?.price ?? 0
  return (
    <span className="shop-price" aria-label={`${NUMBER_FORMAT.format(price)} paillettes`}>
      {NUMBER_FORMAT.format(price)}
    </span>
  )
}
