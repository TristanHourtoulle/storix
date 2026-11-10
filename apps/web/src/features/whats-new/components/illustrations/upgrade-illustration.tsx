import { IllFrame, IllIcon, MiniCard } from './illustration-kit'
import '@/styles/news-ill-upgrade.css'

/** The "À améliorer" switch turns on and keeps only the ×10 card ready to level up. */
export function UpgradeIllustration({ isLive }: { isLive: boolean }) {
  return (
    <IllFrame scene="upg" isLive={isLive}>
      <div className="up-sheet">
        <b>Filtres</b>
        <span className="up-row">
          À améliorer
          <i className="up-switch">
            <i />
          </i>
        </span>
      </div>
      <div className="up-grid">
        <MiniCard tier="R" art={2} className="up-ready">
          <span className="up-count">×10</span>
          <span className="up-badge">
            <IllIcon name="up" strokeWidth={2.6} />
          </span>
        </MiniCard>
        <MiniCard tier="C" art={1} className="up-dim" />
        <MiniCard tier="U" art={3} className="up-dim" />
        <MiniCard tier="E" art={4} className="up-dim" />
      </div>
    </IllFrame>
  )
}
