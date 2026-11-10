import { IllFrame, IllIcon, MiniCard } from './illustration-kit'
import '@/styles/news-ill-showcase.css'

/** A recap pick flies up into a big vitrine card, then a swipe brings the next one. */
export function ShowcaseIllustration({ isLive }: { isLive: boolean }) {
  return (
    <IllFrame scene="big" isLive={isLive}>
      <div className="big-a">
        <MiniCard tier="L" art={0} name="Le port" label="Légendaire" isBig />
        <span className="fs-btn">
          <IllIcon name="expand" />
        </span>
      </div>
      <div className="big-b">
        <MiniCard tier="E" art={4} name="Soirée chez Tom" label="Épique" isBig />
      </div>
      <i className="swipe-dot" />
      <div className="pbar">
        <i />
        <span>Vers Mythique · 7/10</span>
      </div>
      <div className="recap">
        <MiniCard tier="C" art={1} />
        <MiniCard tier="R" art={2} />
        <MiniCard tier="L" art={0} className="pick" />
        <MiniCard tier="E" art={4} />
        <MiniCard tier="R" art={3} />
      </div>
    </IllFrame>
  )
}
