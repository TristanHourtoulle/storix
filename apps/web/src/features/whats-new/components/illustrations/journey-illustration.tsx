import { IllFrame, MiniCard, type MiniTier } from './illustration-kit'
import '@/styles/news-ill-journey.css'

const STEPS: readonly { tier: MiniTier; label: string; date: string }[] = [
  { tier: 'C', label: 'Arrivée dans la pioche', date: '2 nov.' },
  { tier: 'R', label: 'Montée au recalcul', date: '6 nov.' },
  { tier: 'E', label: 'Montée au recalcul', date: '9 nov.' },
]

/** A card page scrolls down to its timeline, whose tier steps light up one by one. */
export function JourneyIllustration({ isLive }: { isLive: boolean }) {
  return (
    <IllFrame scene="jrn" isLive={isLive}>
      <MiniCard tier="E" art={3} className="jr-card" />
      <div className="jr-panel">
        <b>Son parcours</b>
        <ol className="jr-steps">
          {STEPS.map((step, i) => (
            <li key={step.date} className={`jr-step t-${step.tier} is-${i}`}>
              <i className="jr-dot" />
              <span>{step.label}</span>
              <em>{step.date}</em>
            </li>
          ))}
        </ol>
      </div>
    </IllFrame>
  )
}
