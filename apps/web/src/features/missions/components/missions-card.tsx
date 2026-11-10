import { useState } from 'react'
import { MISSION_RESET_HOUR, type MissionRow as Mission, type MissionsState } from '@storix/shared'
import { Icon } from '@/components/ui/icon'
import { MissionRow } from './mission-row'
import { MissionsSheet, type MissionsTab } from './missions-sheet'

interface MissionsCardProps {
  missions: MissionsState
  isRerolling: boolean
  onClaim: (mission: Mission, origin: Element) => void
  onReroll: (missionId: string) => void
  onReset: () => void
}

function completeCount(rows: readonly Mission[]): number {
  return rows.filter((row) => row.isComplete).length
}

/** "Missions du jour" card under the booster widget, folding to one line once the day is claimed. */
export function MissionsCard({
  missions,
  isRerolling,
  onClaim,
  onReroll,
  onReset,
}: MissionsCardProps) {
  const [openTab, setOpenTab] = useState<MissionsTab | null>(null)
  const { day, week } = missions
  const weekDone = completeCount(week.rows)
  const isDayClaimed = day.rows.length > 0 && day.rows.every((row) => row.isClaimed)

  return (
    <section className="mcard" aria-label="Missions du jour">
      {isDayClaimed ? (
        <div className="mcard-wk is-done">
          <span className="mis-ic">
            <Icon name="check" className="mis-glyph" />
          </span>
          <span className="mcard-wk-txt">Missions du jour bouclées · reviens demain</span>
          <button type="button" className="mcard-more" onClick={() => setOpenTab('week')}>
            Voir
          </button>
        </div>
      ) : (
        <>
          <div className="mcard-h">
            <h2>Missions du jour</h2>
            <small>
              {completeCount(day.rows)} / {day.rows.length} · reset {MISSION_RESET_HOUR} h
            </small>
          </div>
          {day.rows.map((mission) => (
            <MissionRow key={mission.id} mission={mission} onClaim={onClaim} />
          ))}
          <div className="mcard-wk">
            <span className="mis-ic">
              <Icon name="trophy" className="mis-glyph" />
            </span>
            <div className="mcard-wk-body">
              <span className="mcard-wk-txt">
                Semaine · {weekDone} {weekDone > 1 ? 'missions' : 'mission'} sur {week.rows.length}
              </span>
              <div className="mis-bar">
                <i
                  style={{
                    width: `${week.rows.length > 0 ? (weekDone / week.rows.length) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
            <button type="button" className="mcard-more" onClick={() => setOpenTab('week')}>
              Voir
            </button>
          </div>
        </>
      )}
      <MissionsSheet
        missions={missions}
        tab={openTab}
        isRerolling={isRerolling}
        onTabChange={setOpenTab}
        onClose={() => setOpenTab(null)}
        onClaim={onClaim}
        onReroll={onReroll}
        onReset={onReset}
      />
    </section>
  )
}
