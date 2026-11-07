import { createFileRoute, redirect } from '@tanstack/react-router'
import { STORAGE_KEYS, readStorage } from '@/lib/storage'

export const Route = createFileRoute('/_authed/')({
  beforeLoad: ({ context }) => {
    const { leagues } = context.me
    const lastLeagueId = readStorage(STORAGE_KEYS.lastLeagueId)
    const target = leagues.find((league) => league.id === lastLeagueId) ?? leagues[0]
    if (!target) throw redirect({ to: '/leagues/new' })
    throw redirect({ to: '/l/$leagueId', params: { leagueId: target.id } })
  },
})
