import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import type { BoosterPull } from '@storix/shared'
import { TIER_LABELS } from '@/features/cards/tier-labels'
import { playSound } from '@/features/sound/sound'
import { tierKey } from '../arcade/tiers'
import { bestPullIndex, pullLabel } from '../pull-label'
import { useLoupeHistory } from '../use-loupe-history'
import { PulledFace } from './arcade-card'
import { PullLoupe } from './pull-loupe'

interface ArcadeSummaryProps {
  leagueId: string
  pulls: readonly BoosterPull[]
  openedAt: string
  leagueName: string
}

export function ArcadeSummary({ leagueId, pulls }: ArcadeSummaryProps) {
  const best = bestPullIndex(pulls)
  const bestPull = pulls[best]
  const heading = pulls.length > 1 ? `Tes ${pulls.length} cartes` : 'Ta carte'
  const history = useLoupeHistory()
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const buttons = useRef(new Map<number, HTMLButtonElement>())
  const hasEntered = useRef(false)

  const closeLoupe = useCallback((index: number): void => {
    hasEntered.current = false
    setOpenIndex(null)
    requestAnimationFrame(() => buttons.current.get(index)?.focus())
  }, [])

  useEffect(() => {
    if (openIndex === null) return
    if (history.isInHistory) hasEntered.current = true
    else if (hasEntered.current) closeLoupe(openIndex)
  }, [history.isInHistory, openIndex, closeLoupe])

  function open(index: number): void {
    playSound({ name: 'tap' })
    setOpenIndex(index)
    history.push()
  }

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
          <li key={pull.slot}>
            <button
              ref={(node) => {
                if (node) buttons.current.set(index, node)
                else buttons.current.delete(index)
              }}
              type="button"
              className={`ar-summary-item${index === best ? ' is-best' : ''}`}
              data-t={tierKey(pull.card.tier)}
              style={{ '--i': index } as CSSProperties}
              aria-label={`Agrandir ${pull.card.title}`}
              aria-haspopup="dialog"
              onClick={() => open(index)}
            >
              <div className="ar-summary-mini">
                <PulledFace pull={pull} />
              </div>
              <span className="ar-summary-name">{pull.card.title}</span>
              <span className="ar-summary-tier">{TIER_LABELS[pull.card.tier]}</span>
              <span className={pull.isFirstCopy ? 'ar-summary-new' : 'ar-summary-dust'}>
                {pullLabel(pull)}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {openIndex !== null ? (
        <PullLoupe
          leagueId={leagueId}
          pulls={pulls}
          index={openIndex}
          onIndexChange={(index) => setOpenIndex(index)}
          onRequestClose={history.pop}
        />
      ) : null}
    </div>
  )
}
