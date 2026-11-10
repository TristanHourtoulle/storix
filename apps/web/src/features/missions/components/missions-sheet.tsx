import { useState } from 'react'
import { MISSION_RESET_HOUR, type MissionRow as Mission, type MissionsState } from '@storix/shared'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { useCountdown } from '@/features/game/use-countdown'
import { formatTimeLeft } from '@/lib/time-left'
import { MissionRow } from './mission-row'

export type MissionsTab = 'day' | 'week'

interface MissionsSheetProps {
  missions: MissionsState
  tab: MissionsTab | null
  isRerolling: boolean
  claimingIds: ReadonlySet<string>
  onTabChange: (tab: MissionsTab) => void
  onClose: () => void
  onClaim: (mission: Mission, origin: Element) => void
  onReroll: (missionId: string) => void
  onReset: () => void
}

function completeCount(rows: readonly Mission[]): number {
  return rows.filter((row) => row.isComplete).length
}

/** Bottom sheet listing the day and week missions with counts, rewards, reroll and the reset countdown. */
export function MissionsSheet({
  missions,
  tab,
  isRerolling,
  claimingIds,
  onTabChange,
  onClose,
  onClaim,
  onReroll,
  onReset,
}: MissionsSheetProps) {
  const [shown, setShown] = useState<MissionsTab>('week')
  if (tab !== null && tab !== shown) setShown(tab)
  const period = shown === 'day' ? missions.day : missions.week
  const remainingMs = useCountdown(period.resetAt, onReset)
  const timeLeft = remainingMs === null ? '' : ` · dans ${formatTimeLeft(remainingMs)}`
  const tabs: { id: MissionsTab; label: string }[] = [
    {
      id: 'day',
      label: `Jour · ${completeCount(missions.day.rows)}/${missions.day.rows.length}`,
    },
    {
      id: 'week',
      label: `Semaine · ${completeCount(missions.week.rows)}/${missions.week.rows.length}`,
    },
  ]

  return (
    <BottomSheet open={tab !== null} title="Missions" onClose={onClose}>
      <p className="msheet-sub">Récupère tes récompenses avant la remise à zéro.</p>
      <div className="mseg" role="tablist" aria-label="Période">
        {tabs.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={shown === id}
            onClick={() => onTabChange(id)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="msheet-list" role="tabpanel">
        {period.rows.map((mission) => (
          <MissionRow
            key={mission.id}
            mission={mission}
            hasCount
            canReroll={shown === 'day' && missions.day.rerollsLeft > 0 && mission.canReroll}
            isRerolling={isRerolling}
            isClaiming={claimingIds.has(mission.id)}
            onClaim={onClaim}
            onReroll={onReroll}
          />
        ))}
      </div>
      <p className="msheet-reset">
        {shown === 'day'
          ? `Missions du jour remises à zéro à ${MISSION_RESET_HOUR} h${timeLeft}`
          : `Semaine remise à zéro lundi à ${MISSION_RESET_HOUR} h${timeLeft}`}
      </p>
    </BottomSheet>
  )
}
