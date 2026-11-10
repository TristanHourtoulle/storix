import { IllFrame, MiniCard } from './illustration-kit'
import '@/styles/news-ill-mythic.css'

const ODDS = [
  ['L', 'Légendaire', '85 %'],
  ['M', 'Mythique', '15 %'],
] as const

/** A Mythic card rises above the league's cards, next to the premium odds. */
export function MythicIllustration({ isLive }: { isLive: boolean }) {
  return (
    <IllFrame scene="myth" isLive={isLive}>
      <div className="my-row">
        <MiniCard tier="E" art={4} />
        <MiniCard tier="L" art={1} />
        <MiniCard tier="R" art={2} />
      </div>
      <div className="my-card">
        <MiniCard tier="M" art={3} name="Aurore" label="Mythique" isBig />
      </div>
      <div className="my-odds">
        {ODDS.map(([tier, label, odds]) => (
          <span key={tier} className={`my-pill t-${tier}`}>
            <i />
            {label} <b>{odds}</b>
          </span>
        ))}
      </div>
    </IllFrame>
  )
}
