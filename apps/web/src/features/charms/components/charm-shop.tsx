import { useState, type CSSProperties } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CHARM_CATALOG, CHARM_CHARGES, type CharmItem } from '@storix/shared'
import { formatDustPrice } from '@/features/cosmetics/cosmetic-copy'
import '@/styles/charms.css'
import { CHARM_COPY, MYTHIC_ABSENT_NOTE, chargesLeftLabel } from '../charm-copy'
import { charmShopQueryOptions } from '../charms.queries'
import { CharmIcon } from './charm-icon'
import { CharmSheet } from './charm-sheet'

interface CharmShopProps {
  leagueId: string
}

const RING_RADIUS = 38
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS

/** Boutique › Bonus: the porte-bonheur slot with its charges, and the charms on sale. */
export function CharmShop({ leagueId }: CharmShopProps) {
  const shop = useQuery(charmShopQueryOptions(leagueId)).data
  const [picked, setPicked] = useState<CharmItem | null>(null)
  const active = shop?.active ?? null
  const activeItem = CHARM_CATALOG.find((charm) => charm.id === active?.id) ?? null
  const charges = active?.charges ?? 0
  const slotStyle = {
    '--c': activeItem ? CHARM_COPY[activeItem.id].color : 'var(--color-muted)',
  } as CSSProperties

  return (
    <div className="charm-shop">
      <div className="charm-slot" style={slotStyle}>
        <span className="charm-ring">
          <svg className="charm-ring-track" viewBox="0 0 86 86" aria-hidden="true">
            <circle cx="43" cy="43" r={RING_RADIUS} className="charm-ring-bg" />
            <circle
              cx="43"
              cy="43"
              r={RING_RADIUS}
              className="charm-ring-fill"
              strokeDasharray={RING_CIRCUMFERENCE}
              strokeDashoffset={RING_CIRCUMFERENCE * (1 - charges / CHARM_CHARGES)}
            />
          </svg>
          {activeItem ? (
            <CharmIcon charm={activeItem.id} className="charm-ring-icon" />
          ) : (
            <CharmIcon charm="trefle" className="charm-ring-icon is-empty" />
          )}
        </span>
        <span className="charm-slot-text">
          <b>{activeItem ? activeItem.name : 'Porte-bonheur vide'}</b>
          <span className="charm-slot-eff">
            {activeItem
              ? CHARM_COPY[activeItem.id].short
              : 'Choisis un bonus pour tes 10 prochains boosters'}
          </span>
          {activeItem ? <span className="charm-slot-left">{chargesLeftLabel(charges)}</span> : null}
        </span>
      </div>
      {shop ? (
        <p className="charm-week">
          {shop.purchasesThisWeek} / {shop.weeklyLimit} bonus cette semaine
        </p>
      ) : null}
      <ul className="charm-list">
        {CHARM_CATALOG.map((charm) => {
          const copy = CHARM_COPY[charm.id]
          const isActive = active?.id === charm.id
          const showMythicNote = copy.isMythicBound && shop?.hasMythic === false
          return (
            <li
              key={charm.id}
              className={`charm-row${isActive ? ' is-active' : ''}`}
              style={{ '--c': copy.color } as CSSProperties}
            >
              <span className="charm-ico">
                <CharmIcon charm={charm.id} />
              </span>
              <span className="charm-row-text">
                <b>{charm.name}</b>
                <span className="charm-row-eff">{copy.short}</span>
                {showMythicNote ? (
                  <span className="charm-row-note">{MYTHIC_ABSENT_NOTE}</span>
                ) : null}
              </span>
              <span className="charm-row-buy">
                <span className="charm-price">{formatDustPrice(charm.price)}</span>
                <button
                  type="button"
                  className={`charm-btn${isActive ? ' is-on' : ''}`}
                  disabled={isActive || shop === undefined}
                  aria-label={
                    isActive
                      ? `${charm.name} est actif`
                      : `${active ? 'Remplacer par' : 'Prendre'} ${charm.name}`
                  }
                  onClick={() => setPicked(charm)}
                >
                  {isActive ? 'Actif' : active ? 'Remplacer' : 'Prendre'}
                </button>
              </span>
            </li>
          )
        })}
      </ul>
      <p className="charm-fine">
        Un seul bonus actif à la fois, 10 boosters chacun. Ils ne changent rien au classement ni aux
        trophées, et la ligue voit le bonus sur tes ouvertures.
      </p>
      <CharmSheet
        leagueId={leagueId}
        charm={picked}
        active={activeItem === null ? null : { item: activeItem, charges }}
        isWeeklyLimitReached={shop !== undefined && shop.purchasesThisWeek >= shop.weeklyLimit}
        onClose={() => setPicked(null)}
      />
    </div>
  )
}
