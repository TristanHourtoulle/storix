import { IllFrame, MiniCard } from './illustration-kit'
import '@/styles/news-ill-reactions.css'

const REACTORS = [
  { initial: 'L', name: 'Léa', glyph: '🔥' },
  { initial: 'T', name: 'Tom', glyph: '♥' },
  { initial: 'M', name: 'Max', glyph: '★' },
] as const

/** Under a card, "ont réagi" opens a sheet listing who reacted and how. */
export function ReactionsIllustration({ isLive }: { isLive: boolean }) {
  return (
    <IllFrame scene="rct" isLive={isLive}>
      <MiniCard tier="L" art={0} className="rc-card" />
      <div className="rc-bar">
        <span>🔥 3</span>
        <span>♥ 2</span>
        <span>★ 1</span>
      </div>
      <div className="rc-sheet">
        <b>Réactions · 6</b>
        <ul>
          {REACTORS.map((reactor) => (
            <li key={reactor.name}>
              <i className="rc-avatar">{reactor.initial}</i>
              <span>{reactor.name}</span>
              <em>{reactor.glyph}</em>
            </li>
          ))}
        </ul>
      </div>
    </IllFrame>
  )
}
