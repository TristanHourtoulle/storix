import { IllFrame, MiniCard } from './illustration-kit'
import '@/styles/news-ill-premium.css'

/** The premium gauge fills to 20/20, then a golden pack reveals a Legendary. */
export function PremiumIllustration({ isLive }: { isLive: boolean }) {
  return (
    <IllFrame scene="prem" isLive={isLive}>
      <div className="pr-gauge">
        <span>Booster premium</span>
        <b>
          <span className="lab">
            <span className="l1">dans 2</span>
            <span className="l2">maintenant</span>
          </span>
        </b>
        <i className="pr-bar">
          <i />
        </i>
      </div>
      <div className="pr-pack">
        <b>STORIX</b>
        <span>Premium · 5 cartes</span>
      </div>
      <div className="pr-card">
        <MiniCard tier="L" art={0} name="Le port" label="Légendaire" isBig />
      </div>
    </IllFrame>
  )
}
