import type { WalletState } from '@storix/shared'

interface PityBarProps {
  pity: WalletState['pity']
}

function EpicRow({ pity }: PityBarProps) {
  if (!pity.epicAvailable) {
    return (
      <div className="pity-row">
        <span>{"Épique garantie dès qu'une carte Épique existera"}</span>
      </div>
    )
  }
  const remaining =
    pity.epicGuaranteeIn === 1 ? 'au prochain booster' : `dans ${pity.epicGuaranteeIn} boosters`
  return (
    <div className="pity-row">
      <span>Épique garantie</span>
      <strong>{remaining}</strong>
    </div>
  )
}

export function PityBar({ pity }: PityBarProps) {
  const percent = Math.round(pity.epicProgress * 100)

  return (
    <section className="pity" aria-label="Garantie">
      <EpicRow pity={pity} />
      <div
        className="bar"
        role="progressbar"
        aria-label="Progression vers l'Épique garantie"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
      >
        <div className="bar-fill" style={{ width: `${percent}%` }} />
      </div>
      {pity.legendaryAvailable && pity.legendaryBonusPercent > 0 ? (
        <div className="pity-row">
          <span>Chance de Légendaire</span>
          <strong className="pity-gold">+{pity.legendaryBonusPercent} %</strong>
        </div>
      ) : null}
    </section>
  )
}
