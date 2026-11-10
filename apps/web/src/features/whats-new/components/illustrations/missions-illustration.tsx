import { IllFrame, IllIcon } from './illustration-kit'
import '@/styles/news-ill-missions.css'

const MISSIONS = [
  { text: 'Ouvre 2 boosters', progress: '2/2', isDone: true },
  { text: 'Réagis à 3 cartes', progress: '1/3', isDone: false },
  { text: 'Envoie un Bravo', progress: '0/1', isDone: false },
] as const

/** The missions notebook under the booster: three daily missions, one ready to claim. */
export function MissionsIllustration({ isLive }: { isLive: boolean }) {
  return (
    <IllFrame scene="missions" isLive={isLive}>
      <div className="ms-title">Missions du jour</div>
      <div className="ms-list">
        {MISSIONS.map((mission) => (
          <div key={mission.text} className={`ms-row${mission.isDone ? ' is-done' : ''}`}>
            <i className="ms-check">{mission.isDone ? <IllIcon name="check" /> : null}</i>
            <span className="ms-text">{mission.text}</span>
            {mission.isDone ? (
              <span className="ms-claim">+10 ✦</span>
            ) : (
              <span className="ms-progress">{mission.progress}</span>
            )}
          </div>
        ))}
      </div>
      <span className="ms-week">Semaine · 2/4</span>
      <i className="ms-spark">✦</i>
    </IllFrame>
  )
}
