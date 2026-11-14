import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { DEFAULT_STANDING_THEME, STANDING_THEME_IDS } from '@storix/shared'
import { z } from 'zod'
import { useMyLeagues } from '@/features/leagues/use-my-leagues'
import { ProfileSubPage } from '@/features/profile/components/profile-sub-page'
import { LEAGUE_TABS, LeaguePage } from '@/features/standings/components/league-page'
import { memberCountLabel } from '@/features/standings/standings-copy'

export const Route = createFileRoute('/_authed/l/$leagueId/league')({
  validateSearch: z.object({
    tab: z.enum(LEAGUE_TABS).optional().catch(undefined),
    theme: z.enum(STANDING_THEME_IDS).optional().catch(undefined),
  }),
  component: LeagueScreen,
})

function LeagueScreen() {
  const { leagueId } = Route.useParams()
  const { tab = 'classement', theme = DEFAULT_STANDING_THEME } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const league = useMyLeagues().find((item) => item.id === leagueId)

  return (
    <ProfileSubPage
      leagueId={leagueId}
      title={league?.name ?? 'Ligue'}
      subtitle={league ? memberCountLabel(league.memberCount) : undefined}
      backLabel="Retour à l’accueil"
      fallback="home"
    >
      <LeaguePage
        leagueId={leagueId}
        tab={tab}
        themeId={theme}
        onTabChange={(next) =>
          void navigate({
            search: (prev) => ({ ...prev, tab: next === 'classement' ? undefined : next }),
            replace: true,
          })
        }
        onThemeChange={(next) =>
          void navigate({
            search: (prev) => ({
              ...prev,
              theme: next === DEFAULT_STANDING_THEME ? undefined : next,
            }),
            replace: true,
          })
        }
      />
    </ProfileSubPage>
  )
}
