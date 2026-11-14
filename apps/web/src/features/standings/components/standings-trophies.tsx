import { Link } from '@tanstack/react-router'
import {
  TROPHIES,
  trophyStanding,
  type StandingsMember,
  type TrophyId,
  type TrophyStanding,
} from '@storix/shared'
import { useCallback, useMemo, useState, type CSSProperties } from 'react'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { formatCount } from '../standings-copy'
import { TROPHY_LOOKS, TrophyGlyph } from '../trophy-glyphs'
import { StandingAvatar } from './standing-avatar'
import { StandingName } from './standing-name'

interface StandingsTrophiesProps {
  leagueId: string
  members: readonly StandingsMember[]
}

type Standing = TrophyStanding<StandingsMember>

const PODIUM_COLORS = ['#fbbf24', '#cbd5e1', '#d97706'] as const

function holderLine(standing: Standing): string {
  if (standing.holders.length === 0) return 'À prendre'
  const names = standing.holders.map((holder) => holder.displayUsername).join(' & ')
  return `${names} · ${formatCount(standing.value)}`
}

interface MedalProps {
  standing: Standing
  onOpen: (id: TrophyId) => void
}

function Medal({ standing, onOpen }: MedalProps) {
  const { trophy, holders } = standing
  const isEmpty = holders.length === 0
  const style = { '--c': TROPHY_LOOKS[trophy.id].color } as CSSProperties
  return (
    <button
      type="button"
      className={`lg-medal${isEmpty ? ' is-empty' : ''}`}
      style={style}
      onClick={() => onOpen(trophy.id)}
    >
      <span className="lg-disc">
        <TrophyGlyph trophyId={trophy.id} className="lg-disc-glyph" />
        {holders.length > 0 ? (
          <span className="lg-disc-holders">
            {holders.slice(0, 2).map((holder) => (
              <StandingAvatar key={holder.userId} member={holder} size="mini" />
            ))}
          </span>
        ) : null}
      </span>
      <b>{trophy.name}</b>
      <small>{holderLine(standing)}</small>
    </button>
  )
}

interface TrophySheetProps {
  leagueId: string
  standing: Standing | null
  isOpen: boolean
  onClose: () => void
}

function TrophySheet({ leagueId, standing, isOpen, onClose }: TrophySheetProps) {
  return (
    <BottomSheet open={isOpen} title={standing?.trophy.name ?? ''} onClose={onClose}>
      {standing ? (
        <div className="lg-tro-sheet">
          <p className="lg-tro-rule">
            <span style={{ color: TROPHY_LOOKS[standing.trophy.id].color }}>
              <TrophyGlyph trophyId={standing.trophy.id} className="lg-tro-glyph" />
            </span>
            {standing.trophy.rule}
          </p>
          {standing.top.length === 0 ? (
            <p className="lg-tro-empty">Personne ne l’a encore. Un seul suffit pour le prendre.</p>
          ) : (
            <ol className="lg-tro-top">
              {standing.top.map((row) => (
                <li key={row.entry.userId}>
                  <Link
                    to="/l/$leagueId/members/$userId"
                    params={{ leagueId, userId: row.entry.userId }}
                    className="lg-tro-row"
                  >
                    <span className="lg-tro-pos" style={{ color: PODIUM_COLORS[row.position - 1] }}>
                      {row.position}
                    </span>
                    <StandingAvatar member={row.entry} size="compact" />
                    <StandingName member={row.entry} className="lg-tro-name" />
                    <span className="lg-tro-val">{formatCount(row.value)}</span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </div>
      ) : null}
    </BottomSheet>
  )
}

/** Trophées tab: the 14 medals; tapping one shows its rule and top three. */
export function StandingsTrophies({ leagueId, members }: StandingsTrophiesProps) {
  const standings = useMemo(
    () => TROPHIES.map((trophy) => trophyStanding(members, trophy)),
    [members],
  )
  const [selectedId, setSelectedId] = useState<TrophyId | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const selected = standings.find((standing) => standing.trophy.id === selectedId) ?? null

  const openTrophy = useCallback((id: TrophyId) => {
    setSelectedId(id)
    setIsOpen(true)
  }, [])

  return (
    <>
      <div className="lg-medals">
        {standings.map((standing) => (
          <Medal key={standing.trophy.id} standing={standing} onOpen={openTrophy} />
        ))}
      </div>
      <TrophySheet
        leagueId={leagueId}
        standing={selected}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  )
}
