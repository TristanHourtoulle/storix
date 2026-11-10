import { IllFrame } from './illustration-kit'
import '@/styles/news-ill-goal.css'

const FRIENDS = ['L', 'T', 'M', 'A'] as const

/** The weekly league goal: a shared gauge with its target and bonus marks, and the friends who helped. */
export function GoalIllustration({ isLive }: { isLive: boolean }) {
  return (
    <IllFrame scene="goal" isLive={isLive}>
      <div className="gl-title">Objectif de la ligue</div>
      <div className="gl-sub">30 boosters cette semaine</div>
      <div className="gl-bar">
        <i className="gl-fill" />
        <i className="gl-mark is-target" />
        <i className="gl-mark is-bonus" />
      </div>
      <div className="gl-labels">
        <span>+2 boosters</span>
        <span>+1 premium</span>
      </div>
      <div className="gl-friends">
        {FRIENDS.map((initial) => (
          <i key={initial} className="gl-avatar">
            {initial}
          </i>
        ))}
        <span className="gl-count">4 amis ont aidé</span>
      </div>
    </IllFrame>
  )
}
