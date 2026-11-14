import { Link } from '@tanstack/react-router'
import {
  PODIUM_MIN_MEMBERS,
  STANDING_THEMES,
  rankStandings,
  standingTheme,
  type RankedEntry,
  type StandingThemeId,
  type StandingsMember,
} from '@storix/shared'
import { useMemo } from 'react'
import { ChipRow } from '@/components/ui/chip-row'
import { useTravelDirection } from '@/features/cosmetics/use-travel-direction'
import { formatCount, ordinal, themeSubline } from '../standings-copy'
import { StandingAvatar } from './standing-avatar'
import { StandingName } from './standing-name'

interface StandingsRankingProps {
  leagueId: string
  members: readonly StandingsMember[]
  leagueCardCount: number
  themeId: StandingThemeId
  onThemeChange: (themeId: StandingThemeId) => void
}

type Ranked = RankedEntry<StandingsMember>

const THEME_OPTIONS = STANDING_THEMES.map((theme) => ({ id: theme.id, label: theme.label }))
const announceTheme = (label: string) => `Classement ${label}`

function themeIndex(themeId: StandingThemeId): number {
  return STANDING_THEMES.findIndex((theme) => theme.id === themeId)
}

interface PodiumStepProps {
  leagueId: string
  row: Ranked | undefined
  step: 1 | 2 | 3
}

function PodiumStep({ leagueId, row, step }: PodiumStepProps) {
  if (row === undefined) return <span />
  return (
    <Link
      to="/l/$leagueId/members/$userId"
      params={{ leagueId, userId: row.entry.userId }}
      className="lg-pod"
    >
      <StandingAvatar member={row.entry} size={step === 1 ? 'xl' : 'lg'} />
      <StandingName member={row.entry} className="lg-pod-name" />
      <span className="lg-pod-val">{formatCount(row.value)}</span>
      <span className={`lg-step s${step}`}>{row.position}</span>
    </Link>
  )
}

interface RankRowProps {
  leagueId: string
  row: Ranked
  leaderValue: number
  subline: string
}

function RankRow({ leagueId, row, leaderValue, subline }: RankRowProps) {
  const width = leaderValue > 0 ? Math.max(2, (row.value / leaderValue) * 100) : 0
  return (
    <li>
      <Link
        to="/l/$leagueId/members/$userId"
        params={{ leagueId, userId: row.entry.userId }}
        className={`lg-row${row.entry.isSelf ? ' is-me' : ''}`}
      >
        <span className="lg-row-pos">
          {row.position}
          {row.isTied ? <span className="lg-eq">=</span> : null}
        </span>
        <StandingAvatar member={row.entry} size="md" />
        <span className="lg-row-main">
          <StandingName member={row.entry} className="lg-row-name" />
          <span className="lg-row-sub">{subline}</span>
          <span className="lg-bar" aria-hidden="true">
            <i style={{ width: `${width}%` }} />
          </span>
        </span>
        <span className="lg-row-val">{formatCount(row.value)}</span>
      </Link>
    </li>
  )
}

/** Classement tab: theme chips, the podium from three members, the list and the viewer's strip. */
export function StandingsRanking({
  leagueId,
  members,
  leagueCardCount,
  themeId,
  onThemeChange,
}: StandingsRankingProps) {
  const theme = standingTheme(themeId)
  const rows = useMemo(() => rankStandings(members, themeId), [members, themeId])
  const direction = useTravelDirection(themeIndex(themeId))
  const hasPodium = rows.length >= PODIUM_MIN_MEMBERS
  const listed = hasPodium ? rows.slice(PODIUM_MIN_MEMBERS) : rows
  const leaderValue = rows[0]?.value ?? 0
  const me = rows.find((row) => row.entry.isSelf)

  return (
    <>
      <ChipRow
        options={THEME_OPTIONS}
        active={themeId}
        onSelect={onThemeChange}
        label="Thèmes de classement"
        announce={announceTheme}
      />
      <div key={themeId} className={`lg-pane ${direction}`}>
        {hasPodium ? (
          <div className="lg-podium">
            <PodiumStep leagueId={leagueId} row={rows[1]} step={2} />
            <PodiumStep leagueId={leagueId} row={rows[0]} step={1} />
            <PodiumStep leagueId={leagueId} row={rows[2]} step={3} />
          </div>
        ) : null}
        {listed.length > 0 ? (
          <ol className="lg-list" start={listed[0]?.position}>
            {listed.map((row) => (
              <RankRow
                key={row.entry.userId}
                leagueId={leagueId}
                row={row}
                leaderValue={leaderValue}
                subline={themeSubline(themeId, row.value, leagueCardCount)}
              />
            ))}
          </ol>
        ) : null}
      </div>
      {me ? (
        <div className="lg-me-strip">
          <span>
            Toi · {ordinal(me.position)} {theme.label}
          </span>
          <b>
            {formatCount(me.value)} {theme.unit}
          </b>
        </div>
      ) : null}
    </>
  )
}
