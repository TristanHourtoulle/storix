import { useQueryClient } from '@tanstack/react-query'
import type { MeResponse } from '@storix/shared'
import { refreshLeagueGoal } from '../league-goal.queries'
import { useLeagueGoal } from '../use-league-goal'
import { GoalCard } from './goal-card'

interface GoalSectionProps {
  leagueId: string
  me: MeResponse
}

/** Home slot for the league goal card; renders nothing until the goal is loaded. */
export function GoalSection({ leagueId, me }: GoalSectionProps) {
  const queryClient = useQueryClient()
  const { goal } = useLeagueGoal(leagueId)
  if (!goal) return null
  return (
    <GoalCard
      leagueId={leagueId}
      goal={goal}
      me={{ id: me.user.id, displayUsername: me.user.displayUsername, avatar: me.avatar }}
      onElapsed={() => refreshLeagueGoal(queryClient, leagueId)}
    />
  )
}
