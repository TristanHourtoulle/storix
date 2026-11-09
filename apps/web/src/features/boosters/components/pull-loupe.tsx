import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react'
import { Link } from '@tanstack/react-router'
import { loupeGesture, wrapIndex, type BoosterPull, type Box } from '@storix/shared'
import { buttonClassName } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { CardFullscreen } from '@/features/cards/components/card-fullscreen'
import { playSound } from '@/features/sound/sound'
import '@/styles/pull-loupe.css'
import { pullCredit, pullLabel } from '../pull-label'
import { useFlipFlight } from '../use-flip-flight'
import { PulledFace } from './arcade-card'

type LoupeDirection = 'next' | 'prev'

interface PullLoupeProps {
  leagueId: string
  pulls: readonly BoosterPull[]
  index: number
  onIndexChange: (index: number, direction: LoupeDirection) => void
  onRequestClose: () => void
  getOrigin: () => Box | null
  isLeaving: boolean
  onLeft: () => void
}

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

interface PointerStart {
  x: number
  y: number
  pointerId: number
}

/** Full-screen loupe over the booster recap: swipe, arrows and dots page through the pack. */
export function PullLoupe({
  leagueId,
  pulls,
  index,
  onIndexChange,
  onRequestClose,
  getOrigin,
  isLeaving,
  onLeft,
}: PullLoupeProps) {
  const [direction, setDirection] = useState<LoupeDirection | null>(null)
  const [isReducedMotion] = useState(() => window.matchMedia(REDUCED_MOTION_QUERY).matches)
  const { flightRef, phase, isFading, leave } = useFlipFlight({ getOrigin, isReducedMotion, onLeft })
  const start = useRef<PointerStart | null>(null)
  const countRef = useRef<HTMLParagraphElement>(null)
  const pull = pulls[index]
  const count = pulls.length

  const goTo = useCallback(
    (next: number, nextDirection: LoupeDirection): void => {
      const target = wrapIndex(next, count)
      if (target === index || isLeaving || phase === 'entering') return
      setDirection(nextDirection)
      playSound({ name: 'flipLight' })
      onIndexChange(target, nextDirection)
    },
    [count, index, isLeaving, onIndexChange, phase],
  )

  useEffect(() => {
    if (isLeaving) leave()
  }, [isLeaving, leave])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
      const layer = countRef.current?.closest('[role="dialog"]')
      if (!layer || !(event.target instanceof Node) || !layer.contains(event.target)) return
      event.preventDefault()
      if (event.key === 'ArrowRight') goTo(index + 1, 'next')
      else goTo(index - 1, 'prev')
    }
    const handlePointerUp = (event: globalThis.PointerEvent): void => {
      const from = start.current
      if (!from || from.pointerId !== event.pointerId) return
      start.current = null
      const gesture = loupeGesture(event.clientX - from.x, event.clientY - from.y)
      if (gesture === 'next') goTo(index + 1, 'next')
      else if (gesture === 'prev') goTo(index - 1, 'prev')
      else if (gesture === 'close') onRequestClose()
    }
    const clearStart = (): void => {
      start.current = null
    }
    document.addEventListener('keydown', handleKeyDown, true)
    document.addEventListener('pointerdown', clearStart, true)
    document.addEventListener('pointerup', handlePointerUp, true)
    window.addEventListener('blur', clearStart)
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true)
      document.removeEventListener('pointerdown', clearStart, true)
      document.removeEventListener('pointerup', handlePointerUp, true)
      window.removeEventListener('blur', clearStart)
    }
  }, [goTo, index, onRequestClose])

  if (!pull) return null

  const stageHandlers = {
    onPointerDown: (event: PointerEvent<HTMLDivElement>) => {
      start.current = { x: event.clientX, y: event.clientY, pointerId: event.pointerId }
    },
    onPointerCancel: () => {
      start.current = null
    },
  }

  const header = (
    <p ref={countRef} className="loupe-count" aria-live="polite">
      {index + 1} / {count}
    </p>
  )

  const footer = (
    <div className="loupe-footer">
      <div className="loupe-meta">
        <span className={`loupe-label ${pull.isFirstCopy ? 'is-new' : 'is-dust'}`}>{pullLabel(pull)}</span>
        <span className="loupe-credit">{pullCredit(pull)}</span>
      </div>
      {count > 1 ? (
        <div className="loupe-arrows">
          <button
            type="button"
            className="icon-btn loupe-arrow"
            aria-label="Carte précédente"
            onClick={() => goTo(index - 1, 'prev')}
          >
            <Icon name="back" className="size-5" />
          </button>
          <div className="loupe-pager">
            {pulls.map((item, k) => (
              <button
                key={item.slot}
                type="button"
                className="loupe-dot"
                aria-label={`Carte ${k + 1}`}
                aria-current={k === index ? 'true' : undefined}
                onClick={() => goTo(k, k > index ? 'next' : 'prev')}
              />
            ))}
          </div>
          <button
            type="button"
            className="icon-btn loupe-arrow"
            aria-label="Carte suivante"
            onClick={() => goTo(index + 1, 'next')}
          >
            <Icon name="forward" className="size-5" />
          </button>
        </div>
      ) : null}
      <div className="loupe-actions">
        <Link
          to="/l/$leagueId/cards/$cardId"
          params={{ leagueId, cardId: pull.card.id }}
          replace
          className={buttonClassName({ variant: 'ghost', block: true })}
        >
          Voir la fiche
        </Link>
      </div>
    </div>
  )

  return (
    <CardFullscreen
      tier={pull.card.tier}
      label="Cartes du booster"
      hint={null}
      className={`pull-loupe is-${phase}${isFading ? ' is-fading' : ''}`}
      flightRef={flightRef}
      header={header}
      footer={footer}
      stageHandlers={stageHandlers}
      onClose={onRequestClose}
    >
      <div key={index} className={`loupe-card${direction ? ` slide-in-${direction}` : ''}`}>
        <PulledFace pull={pull} size="showcase" imageSizes="min(84vw, 360px)" />
      </div>
    </CardFullscreen>
  )
}
