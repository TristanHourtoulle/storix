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

const AVATAR_CLASS =
  'grid size-11 flex-none place-items-center rounded-control bg-surface-2 font-display text-[15px] font-bold text-accent-hover shadow-hairline-strong'

export function LeagueHeader({ name, memberCount, leagues, currentLeagueId }: LeagueHeaderProps) {
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false)
  const canSwitch = leagues.length > 1

  return (
    <header className="flex items-center gap-3">
      <span aria-hidden="true" className={AVATAR_CLASS}>
        {initials(name)}
      </span>
      <div className="min-w-0">
        <h1 className="truncate text-lg">
          {canSwitch ? (
            <button
              type="button"
              aria-haspopup="dialog"
              onClick={() => setIsSwitcherOpen(true)}
              className="inline-flex max-w-full cursor-pointer items-center gap-1 border-0 bg-transparent p-0 text-left font-[inherit] text-[length:inherit] text-inherit"
            >
              <span className="truncate">{name}</span>
              <span className="sr-only">, changer de ligue</span>
              <Icon name="chevron-down" className="size-5 flex-none text-muted" />
            </button>
          ) : (
            name
          )}
        </h1>
        <p className="m-0 mt-0.5 text-[13px] text-muted">
          {memberCount} {memberCount > 1 ? 'membres' : 'membre'}
        </p>
      </div>
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
