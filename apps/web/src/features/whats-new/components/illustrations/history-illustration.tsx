import { IllFrame, type MiniTier } from './illustration-kit'
import '@/styles/news-ill-history.css'

const ROWS: readonly { day: string; tiers: readonly MiniTier[]; isPremium?: boolean }[] = [
  { day: "Aujourd'hui", tiers: ['C', 'U', 'C', 'R', 'L'], isPremium: true },
  { day: 'Hier', tiers: ['C', 'C', 'U', 'U', 'E'] },
  { day: '8 nov.', tiers: ['U', 'C', 'C', 'R', 'R'] },
]

/** The booster history: stat tiles, then one row of five mini cards per opening. */
export function HistoryIllustration({ isLive }: { isLive: boolean }) {
  return (
    <IllFrame scene="hst" isLive={isLive}>
      <div className="hs-stats">
        <span>
          <b>26</b>ouverts
        </span>
        <span>
          <b className="is-gold">2</b>premium
        </span>
        <span>
          <b>4</b>sans Lég.
        </span>
      </div>
      <ul className="hs-rows">
        {ROWS.map((row, i) => (
          <li key={row.day} className={`hs-row is-${i}${row.isPremium ? ' is-premium' : ''}`}>
            <em>{row.day}</em>
            <span className="hs-cards">
              {row.tiers.map((tier, j) => (
                <i key={j} className={`hs-mini t-${tier}`} />
              ))}
            </span>
          </li>
        ))}
      </ul>
    </IllFrame>
  )
}
