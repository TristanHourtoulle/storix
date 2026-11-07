import { useRef, useState, type CSSProperties } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import type { BoosterOpening } from '@storix/shared'
import { Button, buttonClassName } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { TopBar } from '@/components/ui/top-bar'
import { newBoosterRequestId } from '@/features/game/booster-request'
import '@/styles/booster-stage.css'
import '@/styles/booster-card.css'
import '@/styles/booster-pack.css'
import { CENTER_Y, STAGE_HEIGHT, STAMP_TOP } from '../arcade/geometry'
import { useArcadeOpening } from '../use-arcade-opening'
import { useImagesDecoded } from '../use-images-decoded'
import { ArcadeCard } from './arcade-card'
import { ArcadeHand, ArcadeMeta } from './arcade-hud'
import { ArcadePack } from './arcade-pack'
import { ArcadeSummary } from './arcade-summary'

interface BoosterStageProps {
  leagueId: string
  opening: BoosterOpening
}

const WORLD_STYLE = { height: STAGE_HEIGHT, '--cy': `${CENTER_Y}px` } as CSSProperties
const STAMP_STYLE = { top: STAMP_TOP }

export function BoosterStage({ leagueId, opening }: BoosterStageProps) {
  const navigate = useNavigate()
  const { pulls } = opening
  const pullCount = pulls.length
  const stageRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [nextRequestId] = useState(newBoosterRequestId)
  const [isOpeningNext, setIsOpeningNext] = useState(false)
  const { register, isReady } = useImagesDecoded(pullCount)
  const { state, hint, isReduced, onTap, revealAll } = useArcadeOpening(
    pulls,
    stageRef,
    canvasRef,
    isReady,
  )
  const revealedCount = state.revealed.filter(Boolean).length
  const isComplete = revealedCount === pullCount
  const shownPull = state.phase === 'shown' ? pulls[state.current] : undefined
  const hasStock = opening.wallet.booster.stock > 0

  function openAnother() {
    if (isOpeningNext) return
    setIsOpeningNext(true)
    void navigate({
      to: '/l/$leagueId/booster',
      params: { leagueId },
      search: { request: nextRequestId },
      replace: true,
    })
  }

  return (
    <main className="screen ar-screen min-h-dvh">
      <TopBar
        title={`Booster · ${revealedCount} / ${pullCount} révélées`}
        start={
          <Link to="/l/$leagueId" params={{ leagueId }} className="icon-btn" aria-label="Fermer">
            <Icon name="close" />
          </Link>
        }
      />
      <div ref={stageRef} className={`ar-stage${isReduced ? ' rm' : ''}`}>
        <div className="ar-scaler" style={WORLD_STYLE} aria-hidden="true">
          <div className="ar-world">
            <div className="ar-tint" />
            <div className="ar-rays" />
            <ArcadePack count={pullCount} />
            {pulls.map((pull, index) => (
              <ArcadeCard key={pull.slot} pull={pull} registerImage={register(index)} />
            ))}
            <canvas ref={canvasRef} className="ar-fx" />
            <div className="ar-flash" />
            <ArcadeHand pulls={pulls} stashed={state.stashed} />
            <ArcadeMeta pull={shownPull} />
            <p className="ar-stamp" style={STAMP_STYLE} />
          </div>
        </div>
        <button
          type="button"
          className="ar-tap"
          aria-label={hint}
          aria-disabled={state.phase === 'opening' || state.phase === 'revealing'}
          onClick={onTap}
        />
        {state.phase === 'summary' ? <ArcadeSummary pulls={pulls} /> : null}
      </div>
      <p className="sr-only" aria-live="polite">
        {state.announcement}
      </p>
      {state.phase === 'summary' ? null : (
        <p className="ar-hint" aria-hidden="true">
          {hint}
        </p>
      )}
      {isComplete ? (
        <div className="flex flex-col gap-3">
          {hasStock ? (
            <Button variant="primary" block onClick={openAnother} disabled={isOpeningNext}>
              Ouvrir un autre
            </Button>
          ) : null}
          <Link
            to="/l/$leagueId/collection"
            params={{ leagueId }}
            className={buttonClassName({ variant: 'ghost', block: true })}
          >
            Voir ma collection
          </Link>
        </div>
      ) : (
        <Button variant="ghost" block onClick={revealAll} disabled={!isReady}>
          Tout révéler
        </Button>
      )}
    </main>
  )
}
