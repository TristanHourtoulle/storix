import { useRef, useState, type CSSProperties } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import type { BoosterOpening } from '@storix/shared'
import { Button, buttonClassName } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { CharmBadge, CharmOdds } from '@/features/charms/components/charm-opening'
import { TopBar } from '@/components/ui/top-bar'
import { PushPrompt } from '@/features/push/components/push-prompt'
import { newBoosterRequestId } from '@/features/game/booster-request'
import { tearKind } from '@/features/cosmetics/cosmetic-skins'
import { useEquippedStyle } from '@/features/cosmetics/style-context'
import { leagueDetailQueryOptions } from '@/features/leagues/leagues.queries'
import '@/styles/booster-stage.css'
import '@/styles/booster-card.css'
import '@/styles/booster-pack.css'
import '@/styles/cosmetics-arcade.css'
import '@/styles/cosmetics-arcade-themes.css'
import '@/styles/cosmetics-tears-arcade.css'
import '@/styles/charms.css'
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
const PREMIUM_PACK_HINT = 'Booster premium : Légendaire garantie'

export function BoosterStage({ leagueId, opening }: BoosterStageProps) {
  const navigate = useNavigate()
  const { pulls } = opening
  const { pity } = opening.wallet
  const isEpicGuaranteedNext = pity.epicAvailable && pity.epicGuaranteeIn === 1
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
    isEpicGuaranteedNext,
  )
  const revealedCount = state.revealed.filter(Boolean).length
  const isComplete = revealedCount === pullCount
  const shownPull = state.phase === 'shown' ? pulls[state.current] : undefined
  const hasStock = opening.wallet.booster.stock > 0
  const leagueName = useQuery(leagueDetailQueryOptions(leagueId)).data?.name ?? ''
  const tear = tearKind(useEquippedStyle().openingTear)
  const premiumHint = opening.isPremium && state.phase === 'pack' ? PREMIUM_PACK_HINT : null

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
      {opening.charm === null ? null : (
        <div className="charm-opening">
          <CharmBadge charm={opening.charm} />
        </div>
      )}
      <div ref={stageRef} className={`ar-stage${isReduced ? ' rm' : ''}`}>
        <div className="ar-scaler" style={WORLD_STYLE} aria-hidden="true">
          <div className="ar-world">
            <div className="ar-tint" />
            <div className="ar-rays" />
            <ArcadePack count={pullCount} isPremium={opening.isPremium} tear={tear} />
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
          aria-label={premiumHint === null ? hint : `${premiumHint}. ${hint}`}
          aria-disabled={state.phase === 'opening' || state.phase === 'revealing'}
          onClick={onTap}
        />
        {state.phase === 'summary' ? (
          <ArcadeSummary
            leagueId={leagueId}
            pulls={pulls}
            openedAt={opening.openedAt}
            leagueName={leagueName}
            charm={opening.charm}
          />
        ) : null}
      </div>
      <p className="sr-only" aria-live="polite">
        {state.announcement}
      </p>
      {premiumHint === null ? null : (
        <p className="ar-hint is-premium" aria-hidden="true">
          {premiumHint}
        </p>
      )}
      {state.phase === 'summary' ? null : (
        <p className="ar-hint" aria-hidden="true">
          {hint}
        </p>
      )}
      {opening.charm !== null && state.phase === 'pack' ? (
        <CharmOdds charm={opening.charm} isPremium={opening.isPremium} />
      ) : null}
      {isComplete ? (
        <div className="flex flex-col gap-3">
          {state.phase === 'summary' ? <PushPrompt /> : null}
          {hasStock ? (
            <Button
              variant="primary"
              block
              sound="none"
              onClick={openAnother}
              disabled={isOpeningNext}
            >
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
