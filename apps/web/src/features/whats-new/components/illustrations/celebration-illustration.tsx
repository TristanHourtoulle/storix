import { IllFrame, MiniCard } from './illustration-kit'
import '@/styles/news-ill-celebration.css'

/** The upgrade celebration: the card rises, its aura turns to the new rarity and a ★ stamps it. */
export function CelebrationIllustration({ isLive }: { isLive: boolean }) {
  return (
    <IllFrame scene="sacre" isLive={isLive}>
      <i className="sc-aura" />
      <div className="sc-lift">
        <MiniCard tier="L" art={1} name="Aurore" label="Légendaire ★" isBig className="sc-card" />
        <span className="sc-stamp">★</span>
      </div>
      <span className="sc-label">Légendaire ★</span>
    </IllFrame>
  )
}
