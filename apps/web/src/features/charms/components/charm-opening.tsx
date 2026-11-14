import type { CSSProperties } from 'react'
import { findCharm, type BoosterOpening, type BoosterPull } from '@storix/shared'
import { CHARM_COPY, chargesLeftLabel } from '../charm-copy'
import { CharmIcon } from './charm-icon'

type OpeningCharm = NonNullable<BoosterOpening['charm']>

interface CharmBadgeProps {
  charm: OpeningCharm
}

/** The charm used by a booster with the boosters it has left, shown above the opening. */
export function CharmBadge({ charm }: CharmBadgeProps) {
  const item = findCharm(charm.id)
  if (item === undefined) return null
  const left = charm.chargesLeft > 0 ? chargesLeftLabel(charm.chargesLeft) : 'dernier booster'
  return (
    <span className="charm-badge" style={{ '--c': CHARM_COPY[charm.id].color } as CSSProperties}>
      <CharmIcon charm={charm.id} />
      {item.name}
      <em>{left}</em>
    </span>
  )
}

interface CharmOddsProps {
  charm: OpeningCharm
  isPremium: boolean
}

/** The odds the charm changed for this booster: the struck usual value, then the boosted one. */
export function CharmOdds({ charm, isPremium }: CharmOddsProps) {
  const copy = CHARM_COPY[charm.id]
  const lines = isPremium ? copy.premiumOdds : copy.standardOdds
  return (
    <div className="charm-odds" style={{ '--c': copy.color } as CSSProperties}>
      {lines.map((line) => (
        <div key={line.label} className="charm-odds-line">
          <span>{line.label}</span>
          <span>
            {line.before === null ? null : (
              <>
                <s>{line.before}</s>{' '}
              </>
            )}
            <b>{line.after}</b>
          </span>
        </div>
      ))}
    </div>
  )
}

interface CharmRecapProps {
  charm: OpeningCharm
  pulls: readonly BoosterPull[]
}

/** What the charm brought to this booster, under the summary heading. */
export function CharmRecap({ charm, pulls }: CharmRecapProps) {
  const copy = CHARM_COPY[charm.id]
  const boosted = pulls.filter((pull) => pull.isCharmBoosted).length
  const newCards = pulls.filter((pull) => pull.isFirstCopy).length
  return (
    <div className="charm-odds" style={{ '--c': copy.color } as CSSProperties}>
      {charm.id === 'boussole' ? (
        <div className="charm-odds-line">
          <span>Nouvelles cartes</span>
          <b>
            {newCards} sur {pulls.length}
          </b>
        </div>
      ) : null}
      <div className="charm-odds-line">
        <span>{`Cartes touchées grâce ${copy.thanks}`}</span>
        <b>{boosted}</b>
      </div>
    </div>
  )
}

/** The dot marking a card the charm touched, in the charm colour. */
export function CharmDot({ charm }: { charm: OpeningCharm }) {
  return (
    <span
      className="charm-dot"
      style={{ '--c': CHARM_COPY[charm.id].color } as CSSProperties}
      aria-hidden="true"
    />
  )
}
