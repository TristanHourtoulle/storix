import { IllFrame } from './illustration-kit'
import '@/styles/news-ill-emblems.css'

const BADGES = ['M', 'L', 'E', 'R', 'U', 'C', 'L', 'E', 'R'] as const

/** The emblem grid: earned badges glow in their rarity, one is stamped as it unlocks. */
export function EmblemsIllustration({ isLive }: { isLive: boolean }) {
  return (
    <IllFrame scene="emb" isLive={isLive}>
      <div className="em-count">
        <b>7</b>/15 emblèmes
      </div>
      <div className="em-grid">
        {BADGES.map((tier, i) => (
          <i
            key={i}
            className={`em-badge t-${tier}${i > 6 ? ' is-locked' : ''}${i === 0 ? ' is-new' : ''}`}
          />
        ))}
      </div>
      <div className="em-banner">Emblème débloqué !</div>
    </IllFrame>
  )
}
