import { IllFrame, IllIcon, MiniCard } from './illustration-kit'
import '@/styles/news-ill-share.css'

function Mark({ label }: { label: string }) {
  return (
    <span className="pv-mark">
      <img className="lg" src="/icons/icon.svg" alt="" />
      {label}
    </span>
  )
}

/** The share preview cycles through Carte, Flex and Booster, then goes to the iOS share sheet. */
export function ShareIllustration({ isLive }: { isLive: boolean }) {
  return (
    <IllFrame scene="share" isLive={isLive}>
      <div className="sh-prev">
        <div className="pv pv1">
          <MiniCard tier="R" art={2} name="Le lac" label="Rare" className="is-w78" />
          <Mark label="Storix" />
        </div>
        <div className="pv pv2">
          <span className="pv-ban">Tirée en Légendaire !</span>
          <MiniCard tier="L" art={0} name="Le port" label="Légendaire" className="is-w70" />
          <Mark label="Booster du 9 nov." />
        </div>
        <div className="pv pv3">
          <span className="pv-t">Mon booster</span>
          <div className="pv-grid">
            <MiniCard tier="C" art={1} />
            <MiniCard tier="R" art={2} />
            <MiniCard tier="L" art={0} />
            <MiniCard tier="E" art={4} />
            <MiniCard tier="R" art={3} />
          </div>
          <Mark label="Storix" />
        </div>
      </div>
      <div className="sh-chips">
        <span className="c1">Carte</span>
        <span className="c2">Flex</span>
        <span className="c3">Booster</span>
        <small>3 styles, un seul bouton</small>
      </div>
      <div className="sh-sheet">
        <small>Partager l'image</small>
        <div className="apps">
          <span className="app">
            <i className="a1">
              <IllIcon name="chat" />
            </i>
            Messages
          </span>
          <span className="app">
            <i className="a2">
              <IllIcon name="chat" />
            </i>
            Messenger
            <b className="tap" />
          </span>
          <span className="app">
            <i className="a3">
              <IllIcon name="download" />
            </i>
            Enregistrer
          </span>
          <span className="app">
            <i className="a4">
              <IllIcon name="more" strokeWidth={3} />
            </i>
            Plus
          </span>
        </div>
      </div>
    </IllFrame>
  )
}
