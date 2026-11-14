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
      <Link
        to="/l/$leagueId/league"
        params={{ leagueId: currentLeagueId }}
        className="league-entry"
        aria-label={`${name}, classement et trophées`}
      >
        <LeagueAvatar name={name} photo={photo} />
        <span className="min-w-0">
          <span className="flex items-center gap-1">
            <h1 className="truncate text-lg">{name}</h1>
            <span className="league-entry-go" aria-hidden="true">
              ›
            </span>
          </span>
          <p className="m-0 mt-0.5 truncate text-[13px] text-muted">
            {memberCount} {memberCount > 1 ? 'membres' : 'membre'} · Classement et trophées
          </p>
        </span>
      </Link>
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
