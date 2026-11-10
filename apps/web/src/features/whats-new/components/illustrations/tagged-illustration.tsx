import { IllFrame, MiniCard } from './illustration-kit'
import '@/styles/news-ill-tagged.css'

const CHIPS = ['Moi', 'Léa', 'Tom'] as const

/** The "Sur la photo" filter: a member chip narrows the grid to the cards they appear on. */
export function TaggedIllustration({ isLive }: { isLive: boolean }) {
  return (
    <IllFrame scene="tag" isLive={isLive}>
      <div className="tg-sheet">
        <b>Sur la photo</b>
        <span className="tg-chips">
          {CHIPS.map((chip, i) => (
            <i key={chip} className={i === 1 ? 'is-on' : undefined}>
              {chip}
            </i>
          ))}
        </span>
      </div>
      <div className="tg-grid">
        <MiniCard tier="L" art={0} className="is-hit" />
        <MiniCard tier="R" art={2} className="is-miss" />
        <MiniCard tier="E" art={4} className="is-hit" />
        <MiniCard tier="U" art={3} className="is-miss" />
        <MiniCard tier="R" art={1} className="is-hit" />
        <MiniCard tier="C" art={2} className="is-miss" />
      </div>
    </IllFrame>
  )
}
