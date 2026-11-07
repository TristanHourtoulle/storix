import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { hasRoleAtLeast, type LeagueSummary } from '@storix/shared'
import { Icon, type IconName } from '@/components/ui/icon'
import { LeagueSwitcherDialog } from '@/features/leagues/components/league-switcher-dialog'
import { ROLE_LABELS } from '@/features/leagues/role-labels'
import { initials } from '@/lib/initials'

interface LeagueScopeCardProps {
  league: LeagueSummary
  leagues: LeagueSummary[]
}

const TILE_CLASS =
  'flex min-h-[84px] flex-col justify-between gap-2 rounded-input bg-surface-2/80 p-3 text-ink no-underline shadow-hairline hover:bg-surface-2'

function TileContent({ icon, label }: { icon: IconName; label: string }) {
  return (
    <>
      <Icon name={icon} className="size-[22px] text-accent" />
      <span className="text-[13px] leading-tight font-semibold">{label}</span>
    </>
  )
}

/** "Dans cette ligue" card: the current league, a switcher to any league, and its shortcuts. */
export function LeagueScopeCard({ league, leagues }: LeagueScopeCardProps) {
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false)
  const canManage = hasRoleAtLeast(league.role, 'admin')
  const params = { leagueId: league.id }

  return (
    <section
      aria-label={`Dans cette ligue : ${league.name}`}
      className="flex flex-col gap-3.5 rounded-[20px] bg-[linear-gradient(150deg,rgba(167,139,250,0.2),rgba(167,139,250,0.02)_55%),var(--color-surface)] p-4 shadow-hairline-strong"
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="grid size-11 flex-none place-items-center rounded-input bg-surface-2 font-display text-[15px] font-bold text-accent"
        >
          {initials(league.name)}
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
            Dans cette ligue
          </span>
          <h2 className="min-w-0">
            <button
              type="button"
              aria-haspopup="dialog"
              onClick={() => setIsSwitcherOpen(true)}
              className="inline-flex max-w-full cursor-pointer items-center gap-1 border-0 bg-transparent p-0 text-left font-[inherit] text-[length:inherit] text-inherit"
            >
              <span className="truncate">{league.name}</span>
              <span className="sr-only">, changer de ligue</span>
              <Icon name="chevron-down" className="size-5 flex-none text-muted" />
            </button>
          </h2>
        </div>
        <span className="flex-none rounded-full bg-accent/15 px-2.5 py-1 text-xs font-semibold text-accent">
          {ROLE_LABELS[league.role]}
        </span>
      </div>
      <div className={`grid gap-2 ${canManage ? 'grid-cols-3' : 'grid-cols-2'}`}>
        <Link to="/l/$leagueId/tagged" params={params} className={TILE_CLASS}>
          <TileContent icon="photo" label="Photos où tu apparais" />
        </Link>
        {canManage ? (
          <Link
            to="/l/$leagueId/admin"
            params={params}
            aria-label={`Gérer ${league.name}`}
            className={TILE_CLASS}
          >
            <TileContent icon="gear" label="Gérer" />
          </Link>
        ) : null}
        <Link to="/l/$leagueId/profile/ligues" params={params} className={TILE_CLASS}>
          <TileContent icon="trade" label="Mes ligues" />
        </Link>
      </div>
      <LeagueSwitcherDialog
        open={isSwitcherOpen}
        onClose={() => setIsSwitcherOpen(false)}
        leagues={leagues}
        currentLeagueId={league.id}
        destination="profile"
        showRoles
      />
    </section>
  )
}
