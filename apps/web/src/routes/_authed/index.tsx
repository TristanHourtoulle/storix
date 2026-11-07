import { createFileRoute, redirect } from '@tanstack/react-router'
import { readLastLeagueId } from '@/features/leagues/last-league'

export const Route = createFileRoute('/_authed/')({
  beforeLoad: ({ context }) => {
    const { leagues, user } = context.me
    const lastLeagueId = readLastLeagueId(user.id)
    const target = leagues.find((league) => league.id === lastLeagueId) ?? leagues[0]
    if (!target) throw redirect({ to: '/leagues/new' })
    throw redirect({ to: '/l/$leagueId', params: { leagueId: target.id } })
  },
})
