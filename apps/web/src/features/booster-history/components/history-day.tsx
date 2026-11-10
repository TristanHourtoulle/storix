import type { HistoryDayGroup } from '../history-copy'
import { HistoryOpening } from './history-opening'

interface HistoryDayProps {
  leagueId: string
  group: HistoryDayGroup
}

/** A Paris calendar day of openings, under its "Aujourd'hui" / "Hier" / date heading. */
export function HistoryDay({ leagueId, group }: HistoryDayProps) {
  return (
    <section className="hday" aria-label={group.label}>
      <h2 className="hday-h">{group.label}</h2>
      {group.openings.map((opening) => (
        <HistoryOpening key={opening.id} leagueId={leagueId} opening={opening} />
      ))}
    </section>
  )
}
