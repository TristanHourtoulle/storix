import { Link } from '@tanstack/react-router'
import type { LeagueSummary } from '@storix/shared'
import { buttonClassName } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'

interface LeagueSwitcherDialogProps {
  open: boolean
  onClose: () => void
  leagues: LeagueSummary[]
  currentLeagueId: string
}

export function LeagueSwitcherDialog({
  open,
  onClose,
  leagues,
  currentLeagueId,
}: LeagueSwitcherDialogProps) {
  return (
    <Dialog open={open} title="Changer de ligue" onClose={onClose}>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {leagues.map((league) => {
          const isCurrent = league.id === currentLeagueId
          return (
            <li key={league.id}>
              <Link
                to="/l/$leagueId"
                params={{ leagueId: league.id }}
                onClick={onClose}
                aria-current={isCurrent ? 'true' : undefined}
                className={`flex min-h-12 items-center justify-between gap-3 rounded-input bg-surface-2 px-3 py-2 text-ink no-underline ${isCurrent ? 'ring-2 ring-accent' : 'shadow-hairline'}`}
              >
                <span className="min-w-0 truncate text-sm font-medium">{league.name}</span>
                {isCurrent ? (
                  <span className="flex-none text-xs font-semibold text-accent">Actuelle</span>
                ) : null}
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
