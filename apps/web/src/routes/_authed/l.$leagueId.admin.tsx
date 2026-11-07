import { Suspense, useState } from 'react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { Link, createFileRoute, redirect } from '@tanstack/react-router'
import { Icon } from '@/components/ui/icon'
import { TopBar } from '@/components/ui/top-bar'
import { InvitationsPanel } from '@/features/invitations/components/invitations-panel'
import { leagueDetailQueryOptions, loadLeagueDetail } from '@/features/leagues/leagues.queries'
import { MemberList } from '@/features/members/components/member-list'

export const Route = createFileRoute('/_authed/l/$leagueId/admin')({
  beforeLoad: async ({ context, params }) => {
    const league = await loadLeagueDetail(context.queryClient, params.leagueId)
    if (!league?.permissions.canManageMembers) {
      throw redirect({ to: '/l/$leagueId', params: { leagueId: params.leagueId } })
    }
  },
  component: Admin,
})

type Tab = 'members' | 'invitations'

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
      <div className="flex rounded-control bg-surface p-1 shadow-hairline">
        {visibleTabs.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            aria-pressed={tab === id}
            onClick={() => setTab(id)}
            className={`h-10 flex-1 cursor-pointer appearance-none rounded-input border-0 font-display text-sm font-semibold ${tab === id ? 'bg-line text-ink' : 'bg-transparent text-muted'}`}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === 'invitations' && canManageInvitations ? (
        <InvitationsPanel leagueId={leagueId} />
      ) : (
        <Suspense fallback={<p className="m-0 text-sm text-muted">Chargement…</p>}>
          <MemberList leagueId={leagueId} />
        </Suspense>
      )}
    </main>
  )
}
