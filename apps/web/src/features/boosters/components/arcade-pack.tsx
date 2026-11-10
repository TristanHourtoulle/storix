import { CRACK_PATHS, PACK_TOP, PIPS_TOP, SHARDS } from '../arcade/geometry'

const SPARKLE = 'M50 35Q52.25 47.75 65 50Q52.25 52.25 50 65Q47.75 52.25 35 50Q47.75 47.75 50 35Z'
const PACK_STYLE = { top: PACK_TOP }

interface ArcadePackProps {
  count: number
  subtitle?: string
  isChargeHidden?: boolean
  isPremium?: boolean
}

function PackArt({ label, isPremium }: { label: string; isPremium: boolean }) {
  return (
    <div className={`ar-pack-art${isPremium ? ' is-premium' : ''}`}>
      <div className="ar-pa-orb" />
      <div className="ar-pa-foil" />
      <div className="ar-pa-crimp is-top" />
      <div className="ar-pa-crimp is-bottom" />
      <div className="ar-pa-center">
        <div className="ar-pa-mark">
          <svg viewBox="0 0 100 100" aria-hidden="true">
            <path d="M16 16H42L16 42Z" fill="#FBBF24" />
            <path d="M84 84H58L84 58Z" fill="#FBBF24" />
            <path d={SPARKLE} fill="#F2F2F7" />
          </svg>
        </div>
        <div className="ar-pa-word">STORIX</div>
        <div className="ar-pa-sub">{label}</div>
      </div>
    </div>
  )
}

export function ArcadePack({
  count,
  subtitle,
  isChargeHidden = false,
  isPremium = false,
}: ArcadePackProps) {
  const cardsLabel = count > 1 ? `${count} cartes` : '1 carte'
  const label = subtitle ?? (isPremium ? `Premium · ${cardsLabel}` : cardsLabel)
  const premiumClass = isPremium ? ' is-premium' : ''
  return (
    <>
      <div className={`ar-pack-halo${premiumClass}`} style={{ top: PACK_TOP + 145 }} />
      <div className={`ar-pack-pos ar-pack-wrap${premiumClass}`} style={PACK_STYLE}>
        <PackArt label={label} isPremium={isPremium} />
        <svg className="ar-cracks" viewBox="0 0 200 290" aria-hidden="true">
          {CRACK_PATHS.map((group, index) => (
            <g key={index}>
              {group.map((d) => (
                <path key={d} pathLength={1} d={d} />
              ))}
            </g>
          ))}
        </svg>
      </div>
      <div
        className={`ar-pips${isChargeHidden ? ' is-hidden' : ''}`}
        style={{ top: PIPS_TOP }}
        aria-hidden={isChargeHidden || undefined}
      >
        <div className="ar-pips-row">
          <span className="ar-pip" />
          <span className="ar-pip" />
          <span className="ar-pip" />
        </div>
        <span className="ar-pips-label">Charge</span>
      </div>
      {SHARDS.map((poly) => (
        <div key={poly.join()} className="ar-pack-pos ar-shard" style={PACK_STYLE}>
          <div className="ar-shard-clip" style={{ clipPath: `polygon(${poly.join(', ')})` }}>
            <PackArt label={label} isPremium={isPremium} />
          </div>
        </div>
      ))}
    </>
  )
}
