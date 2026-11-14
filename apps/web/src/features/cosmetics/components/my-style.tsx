import { useId, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import {
  DEFAULT_THEME_NAME,
  findCosmetic,
  isLeagueVisibleSlot,
  type CosmeticSlot,
} from '@storix/shared'
import { SegmentedControl, segmentPanelId, segmentTabId } from '@/components/ui/segmented-control'
import { myCosmeticsQueryOptions } from '../cosmetics.queries'
import { STYLE_FAMILY_SLUGS, shopFamily, type StyleFamilySlug } from '../shop-categories'
import { SLOT_TITLE } from '../shop-copy'
import { useTravelDirection } from '../use-travel-direction'
import { ItemThumb } from './item-thumb'
import { StyleSlotSheet } from './style-slot-sheet'

const ORIGINAL_SUFFIX = " · d'origine"

const STYLE_FAMILY_OPTIONS = STYLE_FAMILY_SLUGS.map((slug) => ({
  id: slug,
  label: shopFamily(slug).label,
}))

function wornName(slot: CosmeticSlot, itemId: string | null): string {
  const item = itemId === null ? undefined : findCosmetic(itemId)
  if (item) return item.name
  const name = DEFAULT_THEME_NAME[slot]
  return name === "D'origine" ? name : `${name}${ORIGINAL_SUFFIX}`
}

interface MyStyleProps {
  leagueId: string
}

/** Profil › Mon style: the worn cosmetics of a family, one slot per kind, with a way to change each. */
export function MyStyle({ leagueId }: MyStyleProps) {
  const equipped = useQuery(myCosmeticsQueryOptions).data?.equipped
  const [familySlug, setFamilySlug] = useState<StyleFamilySlug>('cartes')
  const [changing, setChanging] = useState<CosmeticSlot | null>(null)
  const family = shopFamily(familySlug)
  const direction = useTravelDirection(STYLE_FAMILY_SLUGS.indexOf(familySlug))
  const idBase = useId()

  return (
    <main className="screen gap-3.5">
      <div className="style-top">
        <Link to="/l/$leagueId/profile" params={{ leagueId }} className="tryon-back">
          Profil
        </Link>
      </div>
      <h1 className="shop-title">Mon style</h1>
      <SegmentedControl
        label="Familles"
        idBase={idBase}
        options={STYLE_FAMILY_OPTIONS}
        value={familySlug}
        onChange={setFamilySlug}
      />
      <div
        key={familySlug}
        id={segmentPanelId(idBase)}
        role="tabpanel"
        aria-labelledby={segmentTabId(idBase, familySlug)}
        className={`shop-pane ${direction}`}
      >
        <ul className="style-slots">
          {family.categories.map(({ slot }) => {
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
                    {isLeagueVisibleSlot(slot) ? (
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
      </div>
      <StyleSlotSheet leagueId={leagueId} slot={changing} onClose={() => setChanging(null)} />
    </main>
  )
}
