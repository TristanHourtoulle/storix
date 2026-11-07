import type { CSSProperties } from 'react'
import { tierRank, type BoosterPull } from '@storix/shared'
import { TIER_LABELS } from '@/features/cards/tier-labels'
import { tierKey } from '../arcade/tiers'
import { pullLabel } from '../pull-label'
import { PulledFace } from './arcade-card'

interface ArcadeSummaryProps {
  pulls: readonly BoosterPull[]
}

function bestIndex(pulls: readonly BoosterPull[]): number {
  return pulls.reduce((best, pull, index) => {
    const current = pulls[best]
    return current && tierRank(pull.card.tier) > tierRank(current.card.tier) ? index : best
  }, 0)
}

export function ArcadeSummary({ pulls }: ArcadeSummaryProps) {
  const best = bestIndex(pulls)
  const bestPull = pulls[best]
  const heading = pulls.length > 1 ? `Tes ${pulls.length} cartes` : 'Ta carte'

  return (
    <div className="ar-summary">
      <div>
        <p className="ar-eyebrow">Booster ouvert</p>
        <h2 className="ar-summary-title">{heading}</h2>
        {bestPull ? (
          <p className="ar-summary-best">
            Meilleure prise : <strong>{bestPull.card.title}</strong> ·{' '}
            <span className="ar-tpill" data-t={tierKey(bestPull.card.tier)}>
              {TIER_LABELS[bestPull.card.tier]}
            </span>
          </p>
        ) : null}
      </div>
      <ul className="ar-summary-grid">
        {pulls.map((pull, index) => (
          <li
            key={pull.slot}
            className={`ar-summary-item${index === best ? ' is-best' : ''}`}
            data-t={tierKey(pull.card.tier)}
            style={{ '--i': index } as CSSProperties}
          >
            <div className="ar-summary-mini">
              <PulledFace pull={pull} />
            </div>
            <p className="ar-summary-name">{pull.card.title}</p>
            <span className="ar-summary-tier">{TIER_LABELS[pull.card.tier]}</span>
            <span className={pull.isFirstCopy ? 'ar-summary-new' : 'ar-summary-dust'}>
              {pullLabel(pull)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
