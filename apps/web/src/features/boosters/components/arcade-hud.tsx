import type { BoosterPull, CardTier } from '@storix/shared'
import type { ReactNode } from 'react'
import { tierKey } from '../arcade/tiers'
import { pullCredit, pullLabel } from '../pull-label'
import { PulledFace } from './arcade-card'

interface ArcadeSlotItem {
  key: string
  tier: CardTier
  mini: ReactNode
}

interface ArcadeSlotsProps {
  items: readonly ArcadeSlotItem[]
  filled: readonly boolean[]
}

const DENSE_SLOT_COUNT = 6

/** Row of hand slots; each slot shows its mini once filled. */
export function ArcadeSlots({ items, filled }: ArcadeSlotsProps) {
  return (
    <div className={`ar-hand${items.length > DENSE_SLOT_COUNT ? ' is-dense' : ''}`}>
      {items.map((item, index) => {
        const isFilled = filled[index] === true
        return (
          <div
            key={item.key}
            className={`ar-slot${isFilled ? ' is-filled' : ''}`}
            data-t={tierKey(item.tier)}
          >
            {isFilled ? <div className="ar-mini">{item.mini}</div> : null}
          </div>
        )
      })}
    </div>
  )
}

interface ArcadeHandProps {
  pulls: readonly BoosterPull[]
  stashed: readonly boolean[]
}

export function ArcadeHand({ pulls, stashed }: ArcadeHandProps) {
  const items = pulls.map((pull) => ({
    key: String(pull.slot),
    tier: pull.card.tier,
    mini: <PulledFace pull={pull} />,
  }))
  return <ArcadeSlots items={items} filled={stashed} />
}

interface ArcadeMetaProps {
  pull: BoosterPull | undefined
}

export function ArcadeMeta({ pull }: ArcadeMetaProps) {
  return (
    <div className={`ar-meta${pull ? ' is-on' : ''}`}>
      {pull ? (
        <>
          <div className="ar-meta-pills">
            <span className={pull.isFirstCopy ? 'ar-badge-new' : 'ar-badge-dust'}>
              {pullLabel(pull)}
            </span>
            {pull.variant === 'foil' ? <span className="pill gold">Foil</span> : null}
          </div>
          <p className="ar-meta-by">{pullCredit(pull)}</p>
        </>
      ) : null}
    </div>
  )
}
