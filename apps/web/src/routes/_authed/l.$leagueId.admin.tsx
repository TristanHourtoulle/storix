import { Suspense, useState } from 'react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { Link, createFileRoute, redirect } from '@tanstack/react-router'
import { Icon } from '@/components/ui/icon'
import { Segmented } from '@/components/ui/segmented'
import { TopBar } from '@/components/ui/top-bar'
import { AdminCardsPanel } from '@/features/moderation/components/admin-cards-panel'
import { InvitationsPanel } from '@/features/invitations/components/invitations-panel'
import { leagueDetailQueryOptions, loadLeagueDetail } from '@/features/leagues/leagues.queries'
import { MemberList } from '@/features/members/components/member-list'
import { membersQueryOptions } from '@/features/members/members.queries'

export const Route = createFileRoute('/_authed/l/$leagueId/admin')({
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

type Tab = 'members' | 'invitations' | 'cards'

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
]

function Admin() {
  const { leagueId } = Route.useParams()
  const { data: league } = useSuspenseQuery(leagueDetailQueryOptions(leagueId))
  const [tab, setTab] = useState<Tab>('members')
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
      ) : (
        <Suspense fallback={<p className="m-0 text-sm text-muted">Chargement…</p>}>
          <MemberList leagueId={leagueId} />
        </Suspense>
      )}
    </main>
  )
}
