import { IllFrame, MiniCard } from './illustration-kit'
import '@/styles/news-ill-feed.css'

const ROWS = [
  { initial: 'L', text: 'Léa a tiré une Mythique', tier: 'M', art: 0, isBig: true },
  { initial: 'T', text: 'Tom a amélioré une carte ★', tier: 'E', art: 2, isBig: false },
  { initial: 'M', text: 'Max a posté 3 photos', tier: 'R', art: 3, isBig: false },
] as const

/** The "Dans la ligue" feed: a highlighted Mythic pull, an upgrade with a Bravo, grouped photos. */
export function FeedIllustration({ isLive }: { isLive: boolean }) {
  return (
    <IllFrame scene="feed" isLive={isLive}>
      <div className="fd-title">Dans la ligue</div>
      <div className="fd-list">
        {ROWS.map((row) => (
          <div key={row.text} className={`fd-row${row.isBig ? ' is-big' : ''}`}>
            <i className="fd-avatar">{row.initial}</i>
            <span className="fd-text">{row.text}</span>
            <MiniCard tier={row.tier} art={row.art} className="fd-thumb" />
          </div>
        ))}
      </div>
      <span className="fd-bravo">Bravo · 3</span>
    </IllFrame>
  )
}
