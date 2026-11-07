import type { BoosterPull } from '@storix/shared'
import { tierKey } from '../arcade/tiers'
import { pullCredit, pullLabel } from '../pull-label'
import { PulledFace } from './arcade-card'

interface ArcadeHandProps {
  pulls: readonly BoosterPull[]
  stashed: readonly boolean[]
}

export function ArcadeHand({ pulls, stashed }: ArcadeHandProps) {
  return (
    <div className="ar-hand">
      {pulls.map((pull, index) => {
        const isFilled = stashed[index] === true
        return (
          <div
            key={pull.slot}
            className={`ar-slot${isFilled ? ' is-filled' : ''}`}
            data-t={tierKey(pull.card.tier)}
          >
            {isFilled ? (
              <div className="ar-mini">
                <PulledFace pull={pull} />
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

interface ArcadeMetaProps {
  pull: BoosterPull | undefined
}

export function ArcadeMeta({ pull }: ArcadeMetaProps) {
  return (
    <div className={`ar-meta${pull ? ' is-on' : ''}`}>
      {pull ? (
        <>
          <div className="ar-meta-pills">
            <span className={pull.isFirstCopy ? 'ar-badge-new' : 'ar-badge-dust'}>
              {pullLabel(pull)}
            </span>
            {pull.variant === 'foil' ? <span className="pill gold">Foil</span> : null}
          </div>
          <p className="ar-meta-by">{pullCredit(pull)}</p>
        </>
      ) : null}
    </div>
  )
}
