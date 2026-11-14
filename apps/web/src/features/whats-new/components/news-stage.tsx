import { useCallback, useEffect, useRef, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { Link } from '@tanstack/react-router'
import { buttonClassName } from '@/components/ui/button'
import { useModalLayer } from '@/components/crop/use-modal-layer'
import { CENTER_Y, STAGE_HEIGHT, STAMP_TOP } from '@/features/boosters/arcade/geometry'
import { ArcadeCardShell } from '@/features/boosters/components/arcade-card'
import { ArcadeSlots } from '@/features/boosters/components/arcade-hud'
import { ArcadePack } from '@/features/boosters/components/arcade-pack'
import { playSound } from '@/features/sound/sound'
import '@/styles/booster-stage.css'
import '@/styles/booster-card.css'
import '@/styles/booster-pack.css'
import '@/styles/cosmetics-arcade.css'
import '@/styles/cosmetics-arcade-themes.css'
import '@/styles/whats-new.css'
import { featureCountLabel, type NewsDeck } from '../news-deck'
import { formatReleaseLabel } from '../release-dates'
import { useNewsOpening } from '../use-news-opening'
import { useNewsTargets, type NewsTryLink } from '../use-news-targets'
import { NewsCardFace } from './news-card-face'
import { NewsRecap } from './news-recap'

export type NewsCloseReason = 'skip' | 'done' | 'try'

export interface NewsStageProps {
  leagueId: string
  deck: NewsDeck
  mode: 'auto' | 'replay'
  onClose: (reason: NewsCloseReason) => void
}

const WORLD_STYLE = { height: STAGE_HEIGHT, '--cy': `${CENTER_Y}px` } as CSSProperties
const STAMP_STYLE = { top: STAMP_TOP }

interface NewsTryProps {
  link: NewsTryLink | null
  onTry: () => void
}

function NewsTry({ link, onTry }: NewsTryProps) {
  if (link === null) return null
  return (
    <Link {...link} className={buttonClassName({ variant: 'ghost', block: true })} onClick={onTry}>
      Essayer
    </Link>
  )
}

/** Full-screen "Nouveautés" booster: a sealed update pack that opens into one card per feature. */
export function NewsStage({ leagueId, deck, mode, onClose }: NewsStageProps) {
  const { cards } = deck
  const skip = useCallback(() => onClose('skip'), [onClose])
  const { container, layerRef } = useModalLayer(skip)
  const stageRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const tapRef = useRef<HTMLButtonElement>(null)
  const doneRef = useRef<HTMLButtonElement>(null)
  const { state, hint, isReduced, onTap, onPointerDown, onPointerUp, onPointerCancel } =
    useNewsOpening(cards, stageRef, canvasRef)
  const { hrefFor } = useNewsTargets(leagueId, true)
  const { phase } = state

  useEffect(() => {
    const focusPack = (): void => {
      if (!layerRef.current?.contains(document.activeElement)) tapRef.current?.focus()
    }
    tapRef.current?.focus()
    const frame = requestAnimationFrame(focusPack)
    return () => cancelAnimationFrame(frame)
  }, [layerRef])

  useEffect(() => {
    if (phase === 'recap') doneRef.current?.focus()
  }, [phase])
  const shownCard = phase === 'shown' ? cards[state.current] : undefined
  const liveIndex = phase === 'shown' || phase === 'revealing' ? state.current : -1
  const slots = cards.map((card) => ({
    key: card.key,
    tier: card.tier,
    mini: <NewsCardFace card={card} />,
  }))

  function tryIt() {
    onClose('try')
  }

  function finish() {
    playSound({ name: 'confirm' })
    onClose('done')
  }

  return createPortal(
    <div
      ref={layerRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label="Nouveautés"
      className="news-layer"
      data-mode={mode}
    >
      <div className="screen ar-screen news-screen">
        <header className="news-top">
          <p className="ar-eyebrow">Nouveautés</p>
          <button type="button" className="news-skip" onClick={skip}>
            Passer
          </button>
        </header>
        <div
          ref={stageRef}
          className={`ar-stage${isReduced ? ' rm' : ''}${phase === 'recap' ? ' is-recap' : ''}`}
        >
          <div className="ar-scaler" style={WORLD_STYLE} aria-hidden="true">
            <div className="ar-world">
              <div className="ar-tint" />
              <div className="ar-rays" />
              <ArcadePack
                count={cards.length}
                subtitle={formatReleaseLabel(deck.publishedAt)}
                isChargeHidden
              />
              {cards.map((card, index) => (
                <ArcadeCardShell
                  key={card.key}
                  tier={card.tier}
                  front={<NewsCardFace card={card} isLive={index === liveIndex} />}
                />
              ))}
              <canvas ref={canvasRef} className="ar-fx" />
              <div className="ar-flash" />
              <ArcadeSlots items={slots} filled={state.stashed} />
              <p className="ar-stamp" style={STAMP_STYLE} />
            </div>
          </div>
          {phase === 'recap' ? (
            <NewsRecap
              deck={deck}
              mode={mode}
              renderTry={(card) => <NewsTry link={hrefFor(card.tryTarget)} onTry={tryIt} />}
            />
          ) : (
            <button
              ref={tapRef}
              type="button"
              className="ar-tap news-tap"
              aria-label={hint}
              aria-disabled={phase === 'opening' || phase === 'revealing'}
              onClick={onTap}
              onPointerDown={onPointerDown}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerCancel}
            />
          )}
        </div>
        <p className="sr-only" aria-live="polite">
          {state.announcement}
        </p>
        <div className="news-foot">
          {phase === 'pack' || phase === 'opening' ? (
            <p className="news-count">{`${featureCountLabel(deck.featureCount)} · aucune carte à gagner`}</p>
          ) : null}
          {shownCard ? (
            <>
              <p className="news-body">{shownCard.body}</p>
              <NewsTry link={hrefFor(shownCard.tryTarget)} onTry={tryIt} />
            </>
          ) : null}
          {phase === 'recap' ? (
            <button
              ref={doneRef}
              type="button"
              className={buttonClassName({ variant: 'primary', block: true })}
              onClick={finish}
            >
              C'est parti
            </button>
          ) : (
            <p className="ar-hint" aria-hidden="true">
              {hint}
            </p>
          )}
        </div>
      </div>
    </div>,
    container,
  )
}
