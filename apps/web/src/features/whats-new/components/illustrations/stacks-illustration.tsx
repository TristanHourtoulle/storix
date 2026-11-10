import { IllFrame, IllIcon } from './illustration-kit'
import '@/styles/news-ill-stacks.css'

const COUNTS = Array.from({ length: 10 }, (_, index) => `×${index + 1}`)

/** A duplicate pile counts up to ×10, the dust gauge fills, the copy is promoted to Épique ★. */
export function StacksIllustration({ isLive }: { isLive: boolean }) {
  return (
    <IllFrame scene="stack" isLive={isLive}>
      <div className="stk-card">
        <div className="ghost g2" />
        <div className="ghost g1" />
        <div className="ni-mc t-R">
          <div className="ni-art h2" />
          <i className="ni-gem" />
          <div className="ni-band">
            <b>Le lac</b>
            <span className="lab">
              <span className="la">Rare</span>
              <span className="lb">Épique ★</span>
            </span>
          </div>
        </div>
        <div className="up-ring" />
        <div className="stk-badge">
          <div className="strip">
            {COUNTS.map((count) => (
              <span key={count}>{count}</span>
            ))}
          </div>
        </div>
      </div>
      <div className="gg">
        <div>
          <div className="g-l">
            <span>Exemplaires</span>
            <b>10/10</b>
          </div>
          <div className="g-bar">
            <i className="f1" />
          </div>
        </div>
        <div>
          <div className="g-l">
            <span>Paillettes</span>
            <b>50 ✦</b>
          </div>
          <div className="g-bar dust">
            <i className="f2" />
          </div>
        </div>
        <div className="mgo">
          <IllIcon name="up" strokeWidth={2.2} /> Passer Épique ★
        </div>
        <div className="mconv">
          <IllIcon name="recycle" /> Convertir en ✦
        </div>
      </div>
      <div className="seen-chip">
        <i className="ni-av">L</i>
        <span>
          Chez tes amis : <b>Épique ★ chez Léa</b>
        </span>
      </div>
    </IllFrame>
  )
}
