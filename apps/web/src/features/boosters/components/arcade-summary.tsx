import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import type { BoosterPull, Box } from '@storix/shared'
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

export function ArcadeSummary({ leagueId, pulls, openedAt, leagueName }: ArcadeSummaryProps) {
  const best = bestPullIndex(pulls)
  const bestPull = pulls[best]
  const heading = pulls.length > 1 ? `Tes ${pulls.length} cartes` : 'Ta carte'
  const { isInHistory, push, pop } = useLoupeHistory()
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const [isLeaving, setIsLeaving] = useState(false)
  const buttons = useRef(new Map<number, HTMLButtonElement>())
  const minis = useRef(new Map<number, HTMLDivElement>())
  const currentIndex = useRef(0)
  const hasEntered = useRef(false)
  const isCloseRequested = useRef(false)
  const pendingFocus = useRef<number | null>(null)

  useEffect(() => {
    if (openIndex !== null || pendingFocus.current === null) return
    buttons.current.get(pendingFocus.current)?.focus()
    pendingFocus.current = null
  }, [openIndex])

  useEffect(() => {
    if (openIndex === null) return
    currentIndex.current = openIndex
    if (isInHistory) {
      hasEntered.current = true
    } else if (hasEntered.current) {
      isCloseRequested.current = true
      setIsLeaving(true)
    }
  }, [isInHistory, openIndex])

  const getOrigin = useCallback((): Box | null => {
    const mini = minis.current.get(currentIndex.current)
    if (!mini) return null
    const { left, top, width, height } = mini.getBoundingClientRect()
    return { left, top, width, height }
  }, [])

  const handleLeft = useCallback((): void => {
    pendingFocus.current = currentIndex.current
    hasEntered.current = false
    isCloseRequested.current = false
    setIsLeaving(false)
    setOpenIndex(null)
  }, [])

  const requestClose = useCallback((): void => {
    if (isCloseRequested.current) return
    isCloseRequested.current = pop()
  }, [pop])

  function open(index: number): void {
    playSound({ name: 'tap' })
    currentIndex.current = index
    setOpenIndex(index)
    push()
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
              <div
                ref={(node) => {
                  if (node) minis.current.set(index, node)
                  else minis.current.delete(index)
                }}
                className={`ar-summary-mini${index === openIndex ? ' is-lifted' : ''}`}
              >
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
          onIndexChange={(index) => {
            currentIndex.current = index
            setOpenIndex(index)
          }}
          onRequestClose={requestClose}
          getOrigin={getOrigin}
          isLeaving={isLeaving}
          onLeft={handleLeft}
          openedAt={openedAt}
          leagueName={leagueName}
        />
      ) : null}
    </div>
  )
}
