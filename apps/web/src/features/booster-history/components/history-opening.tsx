import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import type { BoosterHistoryOpening, BoosterHistoryPull } from '@storix/shared'
import { TIER_LABELS } from '@/features/cards/tier-labels'
import { openingTime, pullOutcomeLabel, pullTitle } from '../history-copy'
import { HistoryMiniCard } from './history-mini-card'

interface HistoryOpeningProps {
  leagueId: string
  opening: BoosterHistoryOpening
}

function PullRow({ leagueId, pull }: { leagueId: string; pull: BoosterHistoryPull }) {
  const label = `${pullTitle(pull)} · ${TIER_LABELS[pull.tierAtMint]}${pull.variant === 'foil' ? ' foil' : ''}`
  return (
    <li className="hopen-row">
      {pull.card?.kind === 'owned' ? (
        <Link to="/l/$leagueId/cards/$cardId" params={{ leagueId, cardId: pull.card.id }}>
          {label}
        </Link>
      ) : (
        <span>{label}</span>
      )}
      <span className="hopen-outcome">{pullOutcomeLabel(pull)}</span>
    </li>
  )
}

/** One opened booster: time, its five cards in miniature, and the detail rows on tap. */
export function HistoryOpening({ leagueId, opening }: HistoryOpeningProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const pulls = opening.pulls.toSorted((a, b) => a.slot - b.slot)
  return (
    <article className={opening.isPremium ? 'hopen is-premium' : 'hopen'}>
      <button
        type="button"
        className="hopen-toggle"
        aria-expanded={isExpanded}
        onClick={() => setIsExpanded((value) => !value)}
      >
        <span className="hopen-h">
          <b>
            {opening.isPremium ? 'Premium' : 'Booster'} · {openingTime(opening.openedAt)}
          </b>
          <span>{pulls.length} cartes ›</span>
        </span>
        <span className="hopen-five">
          {pulls.map((pull) => (
            <HistoryMiniCard key={pull.slot} pull={pull} />
          ))}
        </span>
      </button>
      {isExpanded ? (
        <ul className="hopen-rows">
          {pulls.map((pull) => (
            <PullRow key={pull.slot} leagueId={leagueId} pull={pull} />
          ))}
        </ul>
      ) : null}
    </article>
  )
}
