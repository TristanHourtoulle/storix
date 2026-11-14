import { useQuery } from '@tanstack/react-query'
import type { StandingThemeId } from '@storix/shared'
import { useId } from 'react'
import { Button } from '@/components/ui/button'
import { SegmentedControl, segmentPanelId, segmentTabId } from '@/components/ui/segmented-control'
import { useTravelDirection } from '@/features/cosmetics/use-travel-direction'
import { standingsQueryOptions } from '../standings.queries'
import { StandingsRanking } from './standings-ranking'
import { StandingsTrophies } from './standings-trophies'

export const LEAGUE_TABS = ['classement', 'trophees'] as const
export type LeagueTab = (typeof LEAGUE_TABS)[number]

const TAB_OPTIONS = [
  { id: 'classement', label: 'Classement' },
  { id: 'trophees', label: 'Trophées' },
] as const satisfies readonly { id: LeagueTab; label: string }[]

interface LeaguePageProps {
  leagueId: string
  tab: LeagueTab
  themeId: StandingThemeId
  onTabChange: (tab: LeagueTab) => void
  onThemeChange: (themeId: StandingThemeId) => void
}

/** The Ligue page: Classement / Trophées, the pill and the panel sliding between them. */
export function LeaguePage({
  leagueId,
  tab,
  themeId,
  onTabChange,
  onThemeChange,
}: LeaguePageProps) {
  const { data, isError, refetch } = useQuery(standingsQueryOptions(leagueId))
  const idBase = useId()
  const direction = useTravelDirection(LEAGUE_TABS.indexOf(tab))

  return (
    <>
      <SegmentedControl
        label="Ligue"
        idBase={idBase}
        options={TAB_OPTIONS}
        value={tab}
        onChange={onTabChange}
      />
      <div
        key={tab}
        id={segmentPanelId(idBase)}
        role="tabpanel"
        aria-labelledby={segmentTabId(idBase, tab)}
        className={`lg-pane lg-tab ${direction}`}
      >
        {data ? (
          tab === 'classement' ? (
            <StandingsRanking
              leagueId={leagueId}
              members={data.members}
              leagueCardCount={data.leagueCardCount}
              themeId={themeId}
              onThemeChange={onThemeChange}
            />
          ) : (
            <StandingsTrophies leagueId={leagueId} members={data.members} />
          )
        ) : isError ? (
          <div role="alert" className="lg-error">
            <p>Impossible de charger le classement.</p>
            <Button variant="ghost" onClick={() => void refetch()}>
              Réessayer
            </Button>
          </div>
        ) : (
          <div aria-hidden="true" className="lg-skeleton" />
        )}
      </div>
    </>
  )
}
