import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { COSMETIC_SLOTS, DEFAULT_THEME_NAME, findCosmetic, type CosmeticSlot } from '@storix/shared'
import { myCosmeticsQueryOptions } from '../cosmetics.queries'
import { SLOT_TITLE } from '../shop-copy'
import { ItemThumb } from './item-thumb'
import { StyleSlotSheet } from './style-slot-sheet'

const ORIGINAL_SUFFIX = " · d'origine"

function wornName(slot: CosmeticSlot, itemId: string | null): string {
  const item = itemId === null ? undefined : findCosmetic(itemId)
  if (item) return item.name
  const name = DEFAULT_THEME_NAME[slot]
  return name === "D'origine" ? name : `${name}${ORIGINAL_SUFFIX}`
}

interface MyStyleProps {
  leagueId: string
}

/** Profil › Mon style: one slot per kind of cosmetic, with what is worn and a way to change it. */
export function MyStyle({ leagueId }: MyStyleProps) {
  const equipped = useQuery(myCosmeticsQueryOptions).data?.equipped
  const [changing, setChanging] = useState<CosmeticSlot | null>(null)

  return (
    <main className="screen gap-3.5">
      <div className="style-top">
        <Link to="/l/$leagueId/profile" params={{ leagueId }} className="tryon-back">
          Profil
        </Link>
      </div>
      <h1 className="shop-title">Mon style</h1>
      <ul className="style-slots">
        {COSMETIC_SLOTS.map((slot) => {
          const itemId = equipped?.[slot] ?? null
          return (
            <li key={slot} className="style-slot">
              <span className="style-slot-icon">
                <ItemThumb slot={slot} itemId={itemId} variant="slot" />
              </span>
              <span>
                <b>{SLOT_TITLE[slot]}</b>
                <small>
                  {wornName(slot, itemId)}
                  {slot === 'avatarFrame' ? (
                    <>
                      {' · '}
                      <em>vu par la ligue</em>
                    </>
                  ) : null}
                </small>
              </span>
              <button
                type="button"
                className="style-change"
                aria-label={`Changer ${SLOT_TITLE[slot].toLowerCase()}`}
                onClick={() => setChanging(slot)}
              >
                Changer
              </button>
            </li>
          )
        })}
      </ul>
      <StyleSlotSheet leagueId={leagueId} slot={changing} onClose={() => setChanging(null)} />
    </main>
  )
}
