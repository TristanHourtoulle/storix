import { Link } from '@tanstack/react-router'
import type { LeagueSummary } from '@storix/shared'
import { buttonClassName } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { ROLE_LABELS } from '../role-labels'

type SwitchDestination = 'home' | 'profile'

interface LeagueSwitcherDialogProps {
  open: boolean
  onClose: () => void
  leagues: LeagueSummary[]
  currentLeagueId: string
  destination?: SwitchDestination
  showRoles?: boolean
}

const DESTINATION_PATHS = {
  home: '/l/$leagueId',
  profile: '/l/$leagueId/profile',
} as const

export function LeagueSwitcherDialog({
  open,
  onClose,
  leagues,
  currentLeagueId,
  destination = 'home',
  showRoles = false,
}: LeagueSwitcherDialogProps) {
  return (
    <Dialog open={open} title="Changer de ligue" onClose={onClose}>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {leagues.map((league) => {
          const isCurrent = league.id === currentLeagueId
          return (
            <li key={league.id}>
              <Link
                to={DESTINATION_PATHS[destination]}
                params={{ leagueId: league.id }}
                onClick={onClose}
                aria-current={isCurrent ? 'true' : undefined}
                className={`flex min-h-12 items-center justify-between gap-3 rounded-input bg-surface-2 px-3 py-2 text-ink no-underline ${isCurrent ? 'ring-2 ring-accent' : 'shadow-hairline'}`}
              >
                <span className="min-w-0 truncate text-sm font-medium">{league.name}</span>
                <span className="flex flex-none items-center gap-2 text-xs text-muted">
                  {isCurrent ? <span className="font-semibold text-accent">Actuelle</span> : null}
                  {showRoles ? ROLE_LABELS[league.role] : null}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
      <Link
        to="/leagues/new"
        onClick={onClose}
        className={buttonClassName({ variant: 'ghost', block: true })}
      >
        Créer une ligue
      </Link>
    </Dialog>
  )
}
