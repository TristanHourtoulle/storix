import { useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import type { BoosterOpening } from '@storix/shared'
import { Button, buttonClassName } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { TopBar } from '@/components/ui/top-bar'
import { TIER_GLOW_CLASS } from '@/features/cards/tier-labels'
import { newBoosterRequestId } from '@/features/game/booster-request'
import { useImagesDecoded } from '../use-images-decoded'
import { useRevealState } from '../use-reveal-state'
import { FlipCard } from './flip-card'
import { RevealSpotlight } from './reveal-spotlight'

interface BoosterStageProps {
  leagueId: string
  opening: BoosterOpening
}

export function BoosterStage({ leagueId, opening }: BoosterStageProps) {
  const navigate = useNavigate()
  const pullCount = opening.pulls.length
  const [nextRequestId] = useState(newBoosterRequestId)
  const [isOpeningNext, setIsOpeningNext] = useState(false)
  const { register, isReady } = useImagesDecoded(pullCount)
  const { revealed, featured, reveal, revealAll, isComplete } = useRevealState(pullCount)
  const revealedCount = revealed.filter(Boolean).length
  const featuredPull = featured === null ? undefined : opening.pulls[featured]
  const hasStock = opening.wallet.booster.stock > 0
  const stageGlow = featuredPull ? TIER_GLOW_CLASS[featuredPull.card.tier] : ''

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
    <div className={`stage flex-1 ${stageGlow}`}>
      <main className="screen min-h-dvh">
        <TopBar
          title={`Booster · ${revealedCount} / ${pullCount} révélées`}
          start={
            <Link to="/l/$leagueId" params={{ leagueId }} className="icon-btn" aria-label="Fermer">
              <Icon name="close" />
            </Link>
          }
        />
        <div className="reveal-slot">
          {featuredPull ? (
            <RevealSpotlight pull={featuredPull} />
          ) : null}
        </div>
        <div className="hand">
          {opening.pulls.map((pull, index) => (
            <FlipCard
              key={pull.slot}
              pull={pull}
              isRevealed={revealed[index] === true}
              isReady={isReady}
              onReveal={() => reveal(index)}
              registerImage={register(index)}
            />
          ))}
        </div>
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
          <>
            <p className="hint">Touchez une carte pour la retourner</p>
            <Button variant="ghost" block onClick={revealAll} disabled={!isReady}>
              Tout révéler
            </Button>
          </>
        )}
      </main>
    </div>
  )
}
