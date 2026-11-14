import { useState } from 'react'
import type { NextTheme } from '@storix/shared'
import { NextThemeSheet } from './next-theme-sheet'

interface NextThemeRowProps {
  leagueId: string
  next: NextTheme
  canOverride: boolean
}

/** « La semaine prochaine : 🍳 Dans la cuisine », with « Remplacer » for admins. */
export function NextThemeRow({ leagueId, next, canOverride }: NextThemeRowProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [openCount, setOpenCount] = useState(0)

  function open(): void {
    setOpenCount((count) => count + 1)
    setIsOpen(true)
  }
  return (
    <div className="series-next">
      <span>
        La semaine prochaine :{' '}
        <b>
          {next.emoji} {next.title}
        </b>
        {next.isOverride ? <em> · choisi par un admin</em> : null}
      </span>
      {canOverride ? (
        <>
          <button type="button" className="series-next-btn" onClick={open}>
            Remplacer
          </button>
          <NextThemeSheet
            key={openCount}
            leagueId={leagueId}
            current={next}
            open={isOpen}
            onClose={() => setIsOpen(false)}
          />
        </>
      ) : null}
    </div>
  )
}
