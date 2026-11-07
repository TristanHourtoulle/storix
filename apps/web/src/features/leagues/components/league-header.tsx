import { useState } from 'react'
import type { LeagueSummary } from '@storix/shared'
import { Icon } from '@/components/ui/icon'
import { initials } from '@/lib/initials'
import { LeagueSwitcherDialog } from './league-switcher-dialog'

interface LeagueHeaderProps {
  name: string
  memberCount: number
  leagues: LeagueSummary[]
  currentLeagueId: string
}

export function LeagueHeader({ name, memberCount, leagues, currentLeagueId }: LeagueHeaderProps) {
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false)
  const canSwitch = leagues.length > 1

  const identity = (
    <>
      <span
        aria-hidden="true"
        className="grid size-11 flex-none place-items-center rounded-control bg-surface-2 font-display text-[15px] font-bold text-accent-hover shadow-hairline-strong"
      >
        {initials(name)}
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-1">
          {canSwitch ? (
            <span className="truncate font-display text-lg font-semibold">{name}</span>
          ) : (
            <h1 className="truncate text-lg">{name}</h1>
          )}
          {canSwitch ? <Icon name="chevron-down" className="size-5 flex-none text-muted" /> : null}
        </span>
        <span className="m-0 mt-0.5 block text-[13px] text-muted">
          {memberCount} {memberCount > 1 ? 'membres' : 'membre'}
        </span>
      </span>
    </>
  )

  return (
    <header>
      {canSwitch ? (
        <>
          <h1 className="sr-only">{name}</h1>
          <button
            type="button"
            onClick={() => setIsSwitcherOpen(true)}
            aria-haspopup="dialog"
            aria-label="Changer de ligue"
            className="flex w-full cursor-pointer items-center gap-3 border-0 bg-transparent p-0 text-left text-ink"
          >
            {identity}
          </button>
          <LeagueSwitcherDialog
            open={isSwitcherOpen}
            onClose={() => setIsSwitcherOpen(false)}
            leagues={leagues}
            currentLeagueId={currentLeagueId}
          />
        </>
      ) : (
        <div className="flex items-center gap-3">{identity}</div>
      )}
    </header>
  )
}
