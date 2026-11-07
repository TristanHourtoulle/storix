import type { WalletState } from '@storix/shared'
import { Button } from '@/components/ui/button'
import { formatCountdown } from '../format-countdown'
import { useCountdown } from '../use-countdown'
import { BoosterPack } from './booster-pack'
import { StockPips } from './stock-pips'

interface BoosterWidgetProps {
  wallet: WalletState
  onOpen: () => void
  onElapsed: () => void
  isPoolEmpty: boolean
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

function PoolEmptyMeta({ nextCardMs }: { nextCardMs: number | null }) {
  return (
    <p className="hero-meta" role="status">
      Pas encore de carte à tirer
      {nextCardMs === null ? null : (
        <>
          <br />
          Prochaine carte dans <strong>{formatCountdown(nextCardMs)}</strong>
        </>
      )}
    </p>
  )
}

export function BoosterWidget({ wallet, onOpen, onElapsed, isPoolEmpty }: BoosterWidgetProps) {
  const { stock, maxStock, nextAt } = wallet.booster
  const remainingMs = useCountdown(nextAt, onElapsed)
  const nextCardMs = useCountdown(isPoolEmpty ? wallet.pool.nextEligibleAt : null, onElapsed)

  return (
    <section className="hero" aria-label="Boosters">
      <BoosterPack size="lg" />
      <div className="hero-body">
        <p className="eyebrow">{stock > 0 ? 'Booster prêt' : 'Prochain booster'}</p>
        <p className="hero-title">{titleFor(stock)}</p>
        <StockPips stock={stock} max={maxStock} />
        {isPoolEmpty ? (
          <PoolEmptyMeta nextCardMs={nextCardMs} />
        ) : (
          <StockMeta remainingMs={remainingMs} />
        )}
        <Button variant="primary" onClick={onOpen} disabled={stock === 0 || isPoolEmpty}>
          Ouvrir
        </Button>
      </div>
    </section>
  )
}
