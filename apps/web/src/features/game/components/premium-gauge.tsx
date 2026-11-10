import { PREMIUM_BOOSTER_EVERY, type WalletState } from '@storix/shared'

interface PremiumGaugeProps {
  premium: WalletState['premium']
}

/** Countdown to the next premium booster, with a slim gold progress bar. */
export function PremiumGauge({ premium }: PremiumGaugeProps) {
  const remaining =
    premium.boostersUntil === 1 ? 'au prochain booster' : `dans ${premium.boostersUntil} boosters`
  const opened = PREMIUM_BOOSTER_EVERY - premium.boostersUntil
  return (
    <div className="hero-premium">
      <p className="hero-pity">
        <span className="hero-pity-dot is-premium" aria-hidden="true" />
        <span>
          Booster <strong className="is-premium">premium</strong> {remaining}
        </span>
      </p>
      <div
        className="hero-premium-bar"
        role="progressbar"
        aria-label="Progression vers le booster premium"
        aria-valuemin={0}
        aria-valuemax={PREMIUM_BOOSTER_EVERY}
        aria-valuenow={opened}
      >
        <span className="hero-premium-fill" style={{ width: `${premium.progress * 100}%` }} />
      </div>
    </div>
  )
}
