import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { MissionRow, MissionsState, WalletState } from '@storix/shared'
import { walletQueryOptions } from '@/features/game/game.queries'
import { refreshFeed } from '@/features/league-feed/league-feed.queries'
import { playSound } from '@/features/sound/sound'
import { logger } from '@/lib/logger'
import { flyToDust } from './fly-to-dust'
import { claimMission, rerollMission } from './missions.api'
import { missionsQueryOptions, refreshMissions } from './missions.queries'

function patchRows(
  state: MissionsState,
  missionId: string,
  patch: (row: MissionRow) => MissionRow,
): MissionsState {
  const patchPeriod = <P extends MissionsState['day'] | MissionsState['week']>(period: P): P => {
    const rows = period.rows.map((row) => (row.id === missionId ? patch(row) : row))
    return { ...period, rows, claimedCount: rows.filter((row) => row.isClaimed).length }
  }
  return { ...state, day: patchPeriod(state.day), week: patchPeriod(state.week) }
}

/** The viewer's missions with claim and reroll actions; a claim plays a coin and flies a paillette to the counter. */
export function useMissions(leagueId: string) {
  const queryClient = useQueryClient()
  const missionsKey = missionsQueryOptions(leagueId).queryKey
  const walletKey = walletQueryOptions(leagueId).queryKey
  const query = useQuery(missionsQueryOptions(leagueId))

  const claimMutation = useMutation({
    mutationFn: (missionId: string) => claimMission(leagueId, missionId),
    onMutate: async (missionId) => {
      await queryClient.cancelQueries({ queryKey: missionsKey })
      queryClient.setQueryData<MissionsState>(missionsKey, (state) =>
        state ? patchRows(state, missionId, (row) => ({ ...row, isClaimed: true })) : state,
      )
    },
    onError: (error) => {
      logger.warn('Mission claim failed', { error })
      refreshMissions(queryClient, leagueId)
    },
  })

  const rerollMutation = useMutation({
    mutationFn: (missionId: string) => rerollMission(leagueId, missionId),
    onSuccess: ({ mission }, missionId) => {
      queryClient.setQueryData<MissionsState>(missionsKey, (state) => {
        if (!state) return state
        const next = patchRows(state, missionId, () => mission)
        return { ...next, day: { ...next.day, rerollsLeft: Math.max(0, next.day.rerollsLeft - 1) } }
      })
      refreshMissions(queryClient, leagueId)
    },
    onError: (error) => {
      logger.warn('Mission reroll failed', { error })
      refreshMissions(queryClient, leagueId)
    },
  })

  async function claim(row: MissionRow, origin: Element | null): Promise<void> {
    playSound({ name: 'coin' })
    const flight = row.reward.dust > 0 && origin !== null ? flyToDust(origin) : Promise.resolve()
    try {
      const [result] = await Promise.all([claimMutation.mutateAsync(row.id), flight])
      queryClient.setQueryData<WalletState>(walletKey, (wallet) =>
        wallet ? { ...wallet, dust: result.dust } : wallet,
      )
      if (result.reward.boosters > 0) void queryClient.invalidateQueries({ queryKey: walletKey })
      if (result.weekCompleted) refreshFeed(queryClient, leagueId)
      refreshMissions(queryClient, leagueId)
    } catch {
      await flight
    }
  }

  return {
    missions: query.data,
    isError: query.isError,
    refetch: query.refetch,
    claim,
    reroll: (missionId: string) => rerollMutation.mutate(missionId),
    isRerolling: rerollMutation.isPending,
  }
}
