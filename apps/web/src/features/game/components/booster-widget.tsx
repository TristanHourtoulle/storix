import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { canOpenBooster, type WalletState } from '@storix/shared'
import { Button } from '@/components/ui/button'
import { formatCountdown } from '../format-countdown'
import { useBoosterReadySound } from '../use-booster-ready-sound'
import { useCountdown } from '../use-countdown'
import { BoosterOddsSheet } from './booster-odds-sheet'
import { BoosterPack } from './booster-pack'
import { PremiumGauge } from './premium-gauge'
import { StockPips } from './stock-pips'

interface BoosterWidgetProps {
  leagueId: string
  wallet: WalletState
  isFresh: boolean
  onOpen: () => void
  onElapsed: () => void
}

function titleFor(stock: number): string {
  if (stock === 0) return 'Aucun booster'
  return stock === 1 ? '1 booster en stock' : `${stock} boosters en stock`
}

function StockMeta({ remainingMs }: { remainingMs: number | null }) {
  return (
    <p className="hero-meta">
      {remainingMs === null ? (
        'Stock plein'
      ) : (
        <>
          Prochain dans <strong>{formatCountdown(remainingMs)}</strong>
        </>
      )}
    </p>
  )
}

function PoolTooSmallMeta({
  drawableCount,
  minimumCards,
  nextCardMs,
}: {
  drawableCount: number
  minimumCards: number
  nextCardMs: number | null
}) {
  return (
    <p className="hero-meta" role="status">
      Il faut au moins {minimumCards} cartes dans les boosters ({drawableCount}/{minimumCards})
      {nextCardMs === null ? null : (
        <>
          {' '}
          · prochaine carte dans <strong>{formatCountdown(nextCardMs)}</strong>
        </>
      )}
    </p>
  )
}

function ExtraBoosters({ bonus, premiumGifts }: { bonus: number; premiumGifts: number }) {
  if (bonus === 0 && premiumGifts === 0) return null
  const parts = [
    bonus > 0 ? `+${bonus} bonus` : null,
    premiumGifts > 0 ? `${premiumGifts} premium ${premiumGifts > 1 ? 'offerts' : 'offert'}` : null,
  ].filter((part) => part !== null)
  return (
    <p className="hero-pity">
      <span className="hero-pity-dot is-bonus" aria-hidden="true" />
      <span>
        dont <strong className="is-bonus">{parts.join(' · ')}</strong>
      </span>
    </p>
  )
}

function EpicGuarantee({ pity }: { pity: WalletState['pity'] }) {
  if (!pity.epicAvailable) return null
  const remaining =
    pity.epicGuaranteeIn === 1 ? 'au prochain booster' : `dans ${pity.epicGuaranteeIn} boosters`
  return (
    <p className="hero-pity">
      <span className="hero-pity-dot" aria-hidden="true" />
      <span>
        <strong>Épique</strong> garantie {remaining}
      </span>
    </p>
  )
}

export function BoosterWidget({
  leagueId,
  wallet,
  isFresh,
  onOpen,
  onElapsed,
}: BoosterWidgetProps) {
  const { stock, maxStock, nextAt, bonus, premiumGifts } = wallet.booster
  const ready = stock + bonus + premiumGifts
  const { pool } = wallet
  const isPoolTooSmall = !canOpenBooster(pool.drawableCount)
  const remainingMs = useCountdown(nextAt, onElapsed)
  const nextCardMs = useCountdown(isPoolTooSmall ? pool.nextEligibleAt : null, onElapsed)
  useBoosterReadySound(stock, remainingMs, isFresh)
  const [isOddsOpen, setIsOddsOpen] = useState(false)

  return (
    <section className="hero" aria-label="Boosters">
      <BoosterPack size="lg" isPremium={premiumGifts > 0 || wallet.premium.boostersUntil === 1} />
      <div className="hero-body">
        <p className="eyebrow">{ready > 0 ? 'Booster prêt' : 'Prochain booster'}</p>
        <p className="hero-title">{titleFor(ready)}</p>
        <StockPips stock={stock} max={maxStock} />
        <ExtraBoosters bonus={bonus} premiumGifts={premiumGifts} />
        {isPoolTooSmall ? (
          <PoolTooSmallMeta
            drawableCount={pool.drawableCount}
            minimumCards={pool.minimumCards}
            nextCardMs={nextCardMs}
          />
        ) : (
          <StockMeta remainingMs={remainingMs} />
        )}
        <EpicGuarantee pity={wallet.pity} />
        <PremiumGauge premium={wallet.premium} />
        <div className="hero-links">
          <button type="button" className="hero-odds" onClick={() => setIsOddsOpen(true)}>
            Probabilités
          </button>
          <Link to="/l/$leagueId/profile/boosters" params={{ leagueId }} className="hero-odds">
            Historique
          </Link>
        </div>
        <Button
          variant="primary"
          sound="none"
          onClick={onOpen}
          disabled={ready === 0 || isPoolTooSmall}
        >
          Ouvrir
        </Button>
      </div>
      <BoosterOddsSheet isOpen={isOddsOpen} onClose={() => setIsOddsOpen(false)} />
    </section>
  )
}
