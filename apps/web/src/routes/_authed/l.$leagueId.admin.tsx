import { Suspense } from 'react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { Link, createFileRoute, redirect } from '@tanstack/react-router'
import { z } from 'zod'
import { Icon } from '@/components/ui/icon'
import { Segmented } from '@/components/ui/segmented'
import { TopBar } from '@/components/ui/top-bar'
import { AdminCardsPanel } from '@/features/moderation/components/admin-cards-panel'
import { InvitationsPanel } from '@/features/invitations/components/invitations-panel'
import { leagueDetailQueryOptions, loadLeagueDetail } from '@/features/leagues/leagues.queries'
import { SettingsForm } from '@/features/league-settings/components/settings-form'
import { MemberList } from '@/features/members/components/member-list'
import { membersQueryOptions } from '@/features/members/members.queries'

const TAB_IDS = ['members', 'invitations', 'cards', 'settings'] as const

type Tab = (typeof TAB_IDS)[number]

export const Route = createFileRoute('/_authed/l/$leagueId/admin')({
  validateSearch: z.object({ tab: z.enum(TAB_IDS).optional().catch(undefined) }),
  beforeLoad: async ({ context, params }) => {
    const league = await loadLeagueDetail(context.queryClient, params.leagueId)
    if (!league?.permissions.canManageMembers) {
      throw redirect({ to: '/l/$leagueId', params: { leagueId: params.leagueId } })
    }
  },
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(membersQueryOptions(params.leagueId)),
  component: Admin,
})

const TABS: readonly {
  id: Tab
  label: string
  isVisible: (canManageInvitations: boolean) => boolean
}[] = [
  { id: 'members', label: 'Membres', isVisible: () => true },
  {
    id: 'invitations',
    label: 'Invitations',
    isVisible: (canManageInvitations) => canManageInvitations,
  },
  { id: 'cards', label: 'Cartes', isVisible: () => true },
  { id: 'settings', label: 'Réglages', isVisible: () => true },
]

function Admin() {
  const { leagueId } = Route.useParams()
  const { data: league } = useSuspenseQuery(leagueDetailQueryOptions(leagueId))
  const { tab = 'members' } = Route.useSearch()
  const navigate = Route.useNavigate()
  const setTab = (next: Tab) => void navigate({ search: { tab: next }, replace: true })
  const { canManageInvitations } = league.permissions
  const visibleTabs = TABS.filter(({ isVisible }) => isVisible(canManageInvitations))

  return (
    <main className="screen">
      <TopBar
        title="Administration"
        start={
          <Link
            to="/l/$leagueId/profile"
            params={{ leagueId }}
            aria-label="Retour"
            className="icon-btn"
          >
            <Icon name="back" className="size-5" />
          </Link>
        }
      />
      <Segmented options={visibleTabs} value={tab} onChange={setTab} />
      {tab === 'invitations' && canManageInvitations ? (
        <InvitationsPanel leagueId={leagueId} />
      ) : tab === 'cards' ? (
        <AdminCardsPanel leagueId={leagueId} />
      ) : tab === 'settings' ? (
        <Suspense fallback={<p className="m-0 text-sm text-muted">Chargement…</p>}>
          <SettingsForm leagueId={leagueId} />
        </Suspense>
      ) : (
        <Suspense fallback={<p className="m-0 text-sm text-muted">Chargement…</p>}>
          <MemberList leagueId={leagueId} />
        </Suspense>
      )}
    </main>
  )
}
