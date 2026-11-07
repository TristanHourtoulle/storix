import { Link } from '@tanstack/react-router'
import type { LeagueRole, LeagueSummary } from '@storix/shared'
import { buttonClassName } from '@/components/ui/button'

interface LeagueListProps {
  leagues: LeagueSummary[]
  currentLeagueId: string
  canAdministerCurrent: boolean
}

const ROLE_LABELS: Record<LeagueRole, string> = {
  owner: 'Propriétaire',
  admin: 'Admin',
  member: 'Membre',
}

export function LeagueList({ leagues, currentLeagueId, canAdministerCurrent }: LeagueListProps) {
  return (
    <section aria-labelledby="leagues-title" className="flex flex-col gap-3">
      <h2 id="leagues-title">Mes ligues</h2>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {leagues.map((league) => (
          <li key={league.id}>
            <Link
              to="/l/$leagueId"
              params={{ leagueId: league.id }}
              aria-current={league.id === currentLeagueId ? 'true' : undefined}
              className="flex min-h-12 items-center justify-between gap-3 rounded-input bg-surface px-3 py-2 text-ink no-underline shadow-hairline"
            >
              <span className="min-w-0 truncate text-sm font-medium">{league.name}</span>
              <span className="flex-none text-xs text-muted">{ROLE_LABELS[league.role]}</span>
            </Link>
          </li>
        ))}
      </ul>
      {canAdministerCurrent ? (
        <Link
          to="/l/$leagueId/admin"
          params={{ leagueId: currentLeagueId }}
          className={buttonClassName({ variant: 'ghost', block: true })}
        >
          Administration de la ligue
        </Link>
      ) : null}
      <Link to="/leagues/new" className={buttonClassName({ variant: 'ghost', block: true })}>
        Créer une ligue
      </Link>
    </section>
  )
}
