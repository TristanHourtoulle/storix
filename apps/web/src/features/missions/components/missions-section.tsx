import { useQueryClient } from '@tanstack/react-query'
import { refreshMissions } from '../missions.queries'
import { useMissions } from '../use-missions'
import { MissionsCard } from './missions-card'

interface MissionsSectionProps {
  leagueId: string
}

/** Home slot for the missions card; renders nothing until the missions are loaded. */
export function MissionsSection({ leagueId }: MissionsSectionProps) {
  const queryClient = useQueryClient()
  const { missions, claim, claimingIds, reroll, isRerolling } = useMissions(leagueId)
  if (!missions) return null
  return (
    <MissionsCard
      missions={missions}
      isRerolling={isRerolling}
      claimingIds={claimingIds}
      onClaim={(mission, origin) => void claim(mission, origin)}
      onReroll={reroll}
      onReset={() => refreshMissions(queryClient, leagueId)}
    />
  )
}
