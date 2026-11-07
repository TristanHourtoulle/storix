import { Link } from '@tanstack/react-router'
import type { LeagueRole, LeagueSummary } from '@storix/shared'
import { buttonClassName } from '@/components/ui/button'

interface LeagueListProps {
  leagues: LeagueSummary[]
  currentLeagueId: string
}

const ROLE_LABELS: Record<LeagueRole, string> = {
  owner: 'Propriétaire',
  admin: 'Admin',
  member: 'Membre',
}

export function LeagueList({ leagues, currentLeagueId }: LeagueListProps) {
  return (
    <section aria-labelledby="leagues-title" className="flex flex-col gap-3">
      <h2 id="leagues-title">Mes ligues</h2>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {leagues.map((league) => {
          const isCurrent = league.id === currentLeagueId
          const canManage = league.role !== 'member'
          return (
            <li
              key={league.id}
              className={`flex items-center gap-2 rounded-input bg-surface pr-2 ${isCurrent ? 'ring-2 ring-accent' : 'shadow-hairline'}`}
            >
              <Link
                to="/l/$leagueId"
                params={{ leagueId: league.id }}
                aria-current={isCurrent ? 'true' : undefined}
                className="flex min-h-12 min-w-0 flex-1 items-center justify-between gap-3 px-3 py-2 text-ink no-underline"
              >
                <span className="min-w-0 truncate text-sm font-medium">{league.name}</span>
                <span className="flex flex-none items-center gap-2 text-xs text-muted">
                  {isCurrent ? <span className="font-semibold text-accent">Actuelle</span> : null}
                  {ROLE_LABELS[league.role]}
                </span>
              </Link>
              {canManage ? (
                <Link
                  to="/l/$leagueId/admin"
                  params={{ leagueId: league.id }}
                  aria-label={`Gérer ${league.name}`}
                  className="flex-none rounded-control px-3 py-2 text-xs font-semibold text-ink no-underline shadow-hairline-strong"
                >
                  Gérer
                </Link>
              ) : null}
            </li>
          )
        })}
      </ul>
      <Link to="/leagues/new" className={buttonClassName({ variant: 'ghost', block: true })}>
        Créer une ligue
      </Link>
    </section>
  )
}
