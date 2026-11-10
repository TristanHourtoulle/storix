import { useState, type CSSProperties } from 'react'
import type { JourneyCause, RarityHistory } from '@storix/shared'
import { TIER_COLOR_VAR, TIER_LABELS } from '../tier-labels'
import { useRarityHistory } from '../use-rarity-history'

type JourneyStepView = RarityHistory['steps'][number]

const VISIBLE_STEPS = 5

const CAUSE_LABELS: Record<JourneyCause, string> = {
  arrival: 'arrivée dans la pioche',
  admin: "choix de l'admin",
  unpinned: "épingle retirée par l'admin",
  up: 'montée au recalcul de la ligue',
  down: 'descendue au recalcul de la ligue',
}

const DAY_MONTH = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' })
const DAY_MONTH_YEAR = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

function shortDate(iso: string): string {
  const date = new Date(iso)
  const format = date.getFullYear() === new Date().getFullYear() ? DAY_MONTH : DAY_MONTH_YEAR
  return format.format(date)
}

function stepLine(step: JourneyStepView, isOnly: boolean): string {
  const date = shortDate(step.at)
  if (step.kind === 'mine') return `${date} · ton amélioration`
  if (isOnly) return `depuis le ${date}`
  return step.cause ? `${date} · ${CAUSE_LABELS[step.cause]}` : date
}

interface JourneyStepProps {
  step: JourneyStepView
  isOnly: boolean
}

function JourneyStep({ step, isOnly }: JourneyStepProps) {
  const isMine = step.kind === 'mine'
  const label = TIER_LABELS[step.tier]
  return (
    <li className="trail-st" style={{ '--tc': TIER_COLOR_VAR[step.tier] } as CSSProperties}>
      <span className={step.tier === 'mythic' ? 'trail-dot t-M' : 'trail-dot'} aria-hidden="true">
        <i />
      </span>
      <div className="min-w-0">
        <b className="trail-tier">
          {isMine ? `Toi · ${label} ★` : label}
          {step.cause === 'admin' || step.cause === 'unpinned' ? (
            <span className="trail-src">admin</span>
          ) : null}
        </b>
        <small className="trail-line">{stepLine(step, isOnly)}</small>
      </div>
    </li>
  )
}

function JourneySkeleton() {
  return (
    <ol className="trail" aria-hidden="true">
      {[0, 1].map((key) => (
        <li key={key} className="trail-st is-skeleton">
          <span className="trail-dot" />
          <div className="grid gap-1.5">
            <span className="trail-skel w-20" />
            <span className="trail-skel w-36" />
          </div>
        </li>
      ))}
    </ol>
  )
}

interface RarityJourneyProps {
  leagueId: string
  cardId: string
}

/** The card's rarity journey as a vertical dated timeline, newest first, at the bottom of the vitrine. */
export function RarityJourney({ leagueId, cardId }: RarityJourneyProps) {
  const { data, isPending, isError } = useRarityHistory(leagueId, cardId)
  const [isExpanded, setIsExpanded] = useState(false)
  if (isError || (data && data.steps.length === 0)) return null
  const steps = data?.steps ?? []
  const visible = isExpanded ? steps : steps.slice(0, VISIBLE_STEPS)
  const hiddenCount = steps.length - VISIBLE_STEPS

  return (
    <section className="journey" aria-label="Son parcours">
      <div className="journey-h">
        <h3>Son parcours</h3>
        <small>du plus récent</small>
      </div>
      {isPending ? (
        <JourneySkeleton />
      ) : (
        <ol className="trail">
          {visible.map((step) => (
            <JourneyStep key={`${step.kind}-${step.at}`} step={step} isOnly={steps.length === 1} />
          ))}
        </ol>
      )}
      {hiddenCount > 0 ? (
        <button
          type="button"
          className="journey-more"
          aria-expanded={isExpanded}
          onClick={() => setIsExpanded((value) => !value)}
        >
          <span>{isExpanded ? 'Voir moins' : `Voir tout (${steps.length})`}</span>
          <span aria-hidden="true">{isExpanded ? '‹' : '›'}</span>
        </button>
      ) : null}
    </section>
  )
}
