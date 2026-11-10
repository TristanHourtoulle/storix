import { IllFrame, IllIcon, MiniCard, type MiniTier } from './illustration-kit'
import '@/styles/news-ill-sort.css'

const GRID: readonly { tier: MiniTier; art: 0 | 1 | 2 | 3 | 4; isNew: boolean }[] = [
  { tier: 'L', art: 0, isNew: true },
  { tier: 'E', art: 4, isNew: true },
  { tier: 'E', art: 1, isNew: false },
  { tier: 'R', art: 2, isNew: false },
  { tier: 'R', art: 3, isNew: false },
  { tier: 'R', art: 1, isNew: true },
  { tier: 'C', art: 2, isNew: false },
  { tier: 'C', art: 4, isNew: false },
]

const OPTIONS = [
  ['Rareté', "les plus rares d'abord"],
  ['Découverte', 'avec les dates'],
  ['Numéro', "l'ordre d'arrivée"],
] as const

/** The Trier sheet switches from Rareté to Découverte, then "Tout marquer comme vu" clears NEW. */
export function SortIllustration({ isLive }: { isLive: boolean }) {
  return (
    <IllFrame scene="sort" isLive={isLive}>
      <div className="so-top">
        <b>Collection</b>
        <span className="so-chip">
          <IllIcon name="sort" />
          <span className="lab">
            <span className="l1">Rareté</span>
            <span className="l2">Découverte</span>
          </span>
        </span>
      </div>
      <div className="so-grid">
        {GRID.map(({ tier, art, isNew }, index) => (
          <MiniCard key={index} tier={tier} art={art}>
            {isNew ? <span className="ni-new">NEW</span> : null}
          </MiniCard>
        ))}
      </div>
      <div className="so-seen">
        <IllIcon name="check" strokeWidth={2.4} /> Tout marquer comme vu
      </div>
      <div className="so-sheet">
        <b>Trier</b>
        <div className="so-opts">
          <span className="so-sel" />
          {OPTIONS.map(([title, detail]) => (
            <span key={title} className="so-opt">
              <i />
              <span>
                <b>{title}</b> · {detail}
              </span>
            </span>
          ))}
        </div>
      </div>
    </IllFrame>
  )
}
