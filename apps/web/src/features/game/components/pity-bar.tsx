import type { WalletState } from '@storix/shared'

interface PityBarProps {
  pity: WalletState['pity']
}

export function PityBar({ pity }: PityBarProps) {
  const remaining =
    pity.epicGuaranteeIn === 1 ? 'au prochain booster' : `dans ${pity.epicGuaranteeIn} boosters`
  const percent = Math.round(pity.epicProgress * 100)

  return (
    <section className="pity" aria-label="Garantie">
      <div className="pity-row">
        <span>Épique garantie</span>
        <strong>{remaining}</strong>
      </div>
      <div className="bar" role="presentation">
        <div className="bar-fill" style={{ width: `${percent}%` }} />
      </div>
      {pity.legendaryBonusPercent > 0 ? (
        <div className="pity-row">
          <span>Chance de Légendaire</span>
          <strong className="pity-gold">+{pity.legendaryBonusPercent} %</strong>
        </div>
      ) : null}
    </section>
  )
}
