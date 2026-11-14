import { useState, type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import type { LeagueSummary, Portrait } from '@storix/shared'
import { Icon } from '@/components/ui/icon'
import { LeagueAvatar } from './league-avatar'
import { LeagueSwitcherDialog } from './league-switcher-dialog'

interface LeagueHeaderProps {
  name: string
  photo: Portrait | null
  memberCount: number
  leagues: LeagueSummary[]
  currentLeagueId: string
  trailing?: ReactNode
}

/**
 * Home header: the league avatar and name open the Ligue page (ranking and trophies); a small
 * button keeps the league switcher for members of several leagues.
 */
export function LeagueHeader({
  name,
  photo,
  memberCount,
  leagues,
  currentLeagueId,
  trailing,
}: LeagueHeaderProps) {
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false)
  const canSwitch = leagues.length > 1

  return (
    <header className="flex items-center gap-3">
      <h1 className="m-0 flex min-w-0 flex-1 font-[inherit] text-[length:inherit]">
        <Link
          to="/l/$leagueId/league"
          params={{ leagueId: currentLeagueId }}
          className="league-entry"
        >
          <LeagueAvatar name={name} photo={photo} />
          <span className="flex min-w-0 flex-col">
            <span className="flex items-center gap-1">
              <span className="truncate font-display text-lg font-bold">{name}</span>
              <span className="league-entry-go" aria-hidden="true">
                ›
              </span>
            </span>
            <span className="mt-0.5 truncate text-[13px] font-normal text-muted">
              {memberCount} {memberCount > 1 ? 'membres' : 'membre'} · Classement et trophées
            </span>
          </span>
        </Link>
      </h1>
      {canSwitch ? (
        <button
          type="button"
          className="league-switch-btn"
          aria-haspopup="dialog"
          aria-label="Changer de ligue"
          onClick={() => setIsSwitcherOpen(true)}
        >
          <Icon name="trade" className="size-[18px]" />
        </button>
      ) : null}
      {trailing ? <div className="flex-none">{trailing}</div> : null}
      {canSwitch ? (
        <LeagueSwitcherDialog
          open={isSwitcherOpen}
          onClose={() => setIsSwitcherOpen(false)}
          leagues={leagues}
          currentLeagueId={currentLeagueId}
        />
      ) : null}
    </header>
  )
}
