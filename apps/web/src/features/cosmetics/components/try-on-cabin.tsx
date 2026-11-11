import { useMemo, useState, type CSSProperties } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import type { CosmeticItemId, CosmeticSlot } from '@storix/shared'
import { formatDustPrice } from '../cosmetic-copy'
import { myCosmeticsQueryOptions } from '../cosmetics.queries'
import { shopCategory, type ShopCategorySlug } from '../shop-categories'
import { themeAccent } from '../shop-copy'
import { optionState, slotOptions, type ShopOption } from '../shop-options'
import { StylePreview } from '../style-context'
import { useEquipCosmetic } from '../use-equip-cosmetic'
import { useThemeSwipe } from '../use-theme-swipe'
import { useTryOnCards, type TryOnSource } from '../use-try-on-cards'
import { PurchaseSheet } from './purchase-sheet'
import { TryOnPreview } from './try-on-preview'

const RARITY_HINT: Readonly<Record<TryOnSource, string>> = {
  collection: 'Sur 6 cartes de ta collection',
  mixed: "Sur tes cartes et des cartes d'exemple",
  samples: "Sur des cartes d'exemple",
}

const SLOT_HINT: Readonly<Record<Exclude<CosmeticSlot, 'raritySet'>, string>> = {
  booster: 'Tes boosters standard et premium',
  cardBack: "Au moment d'ouvrir un booster",
  avatarFrame: 'Autour de ta photo, vu par toute la ligue',
  revealAura: 'Juste avant que ta carte se retourne',
}

interface TryOnCabinProps {
  leagueId: string
  category: ShopCategorySlug
  initialItemId: CosmeticItemId | undefined
}

/** Full-screen try-on: a theme applied to the viewer's own cards or booster, swiped through, bought from here. */
export function TryOnCabin({ leagueId, category, initialItemId }: TryOnCabinProps) {
  const { slot, eyebrow } = shopCategory(category)
  const options = useMemo(() => slotOptions(slot), [slot])
  const [index, setIndex] = useState(() =>
    Math.max(
      0,
      options.findIndex((option) => option.itemId === (initialItemId ?? null)),
    ),
  )
  const [buying, setBuying] = useState<ShopOption | null>(null)
  const mine = useQuery(myCosmeticsQueryOptions).data
  const tryOn = useTryOnCards(leagueId)
  const equip = useEquipCosmetic()
  const option = options[index] ?? options[0]
  const swipe = useThemeSwipe((delta) => {
    if (buying !== null) return
    setIndex((current) => Math.min(options.length - 1, Math.max(0, current + delta)))
  })
  const override = useMemo(() => ({ [slot]: option?.itemId ?? null }), [slot, option])
  if (option === undefined) return null
  const state = optionState(option, mine)
  const hint = slot === 'raritySet' ? RARITY_HINT[tryOn.source] : SLOT_HINT[slot]
  const accent = { '--tryon-accent': themeAccent(option.itemId) } as CSSProperties

  return (
    <main
      className="tryon"
      style={accent}
      tabIndex={-1}
      aria-roledescription="cabine d'essayage"
      {...swipe}
    >
      <div className="tryon-head">
        <div className="tryon-top">
          <Link
            to="/l/$leagueId/shop"
            params={{ leagueId }}
            search={{ category }}
            className="tryon-back"
          >
            Boutique
          </Link>
          <span className="tryon-tag">Essai · rien n'est dépensé</span>
        </div>
        <div className="tryon-titles" aria-live="polite">
          <span className="tryon-eyebrow">{eyebrow}</span>
          <h1 className="tryon-name">{option.name}</h1>
          <span className="tryon-hint">{hint}</span>
        </div>
      </div>
      <div className={`tryon-stage${slot === 'raritySet' ? ' is-top' : ''}`}>
        <StylePreview override={override}>
          <TryOnPreview slot={slot} faces={tryOn.faces} />
        </StylePreview>
      </div>
      <div className="tryon-foot">
        <div className="tryon-dots">
          {options.map((item, dot) => (
            <button
              key={item.itemId ?? 'original'}
              type="button"
              aria-label={item.name}
              aria-current={dot === index}
              onClick={() => setIndex(dot)}
            />
          ))}
        </div>
        {state === 'forSale' && option.item ? (
          <button type="button" className="shop-btn" onClick={() => setBuying(option)}>
            {`Acheter · ${formatDustPrice(option.item.price)}`}
          </button>
        ) : state === 'owned' ? (
          <button
            type="button"
            className="shop-btn"
            disabled={equip.isPending}
            aria-busy={equip.isPending}
            onClick={() => equip.equip({ slot, itemId: option.itemId })}
          >
            Porter
          </button>
        ) : (
          <button type="button" className="shop-btn is-ghost" disabled>
            Porté
          </button>
        )}
        {equip.errorMessage ? (
          <p role="alert" className="m-0 text-center text-sm text-danger">
            {equip.errorMessage}
          </p>
        ) : null}
      </div>
      <PurchaseSheet leagueId={leagueId} option={buying} onClose={() => setBuying(null)} />
    </main>
  )
}
