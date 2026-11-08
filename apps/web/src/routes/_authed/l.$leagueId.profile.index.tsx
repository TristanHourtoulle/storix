import { useSuspenseQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { Notice } from '@/components/ui/notice'
import {
  SettingsGroup,
  SettingsRowContent,
  settingsRowClassName,
} from '@/components/ui/settings-list'
import { DeleteAccountRow } from '@/features/account/components/delete-account-row'
import { meQueryOptions } from '@/features/auth/session.queries'
import { useLogout } from '@/features/auth/use-logout'
import { usePasskeys } from '@/features/auth/use-passkeys'
import { useMyLeagues } from '@/features/leagues/use-my-leagues'
import { LeaveLeagueRow, OwnerLeaveHint } from '@/features/members/components/leave-league-row'
import { LeagueScopeCard } from '@/features/profile/components/league-scope-card'
import { pushStatusSummary } from '@/features/push/push-status'
import { usePushNotifications } from '@/features/push/use-push-notifications'
import { useSoundSettings, type SoundSettings } from '@/features/sound/sound-settings'

export const Route = createFileRoute('/_authed/l/$leagueId/profile/')({
  component: Profile,
})

function soundSummary({ isBoosterEnabled, isInterfaceEnabled }: SoundSettings): string {
  if (isBoosterEnabled && isInterfaceEnabled) return 'Tous'
  if (isBoosterEnabled) return 'Booster'
  return isInterfaceEnabled ? 'Interface' : 'Coupés'
}

function Profile() {
  const { leagueId } = Route.useParams()
  const { data: me } = useSuspenseQuery(meQueryOptions)
  const leagues = useMyLeagues()
  const { passkeys, isReady: arePasskeysReady } = usePasskeys()
  const { logout, isPending, errorMessage } = useLogout()
  const soundSettings = useSoundSettings()
  const push = usePushNotifications()

  if (!me) return null
  const currentLeague = leagues.find((league) => league.id === leagueId)
  const params = { leagueId }

  return (
    <main className="screen gap-5">
      <h1 className="sr-only">Profil</h1>
      <Link
        to="/l/$leagueId/profile/pseudo"
        params={params}
        aria-label={`${me.user.displayUsername}, @${me.user.username}, modifier le pseudo affiché`}
        className="flex items-center gap-3.5 rounded-control p-1 text-ink no-underline hover:bg-surface"
      >
        <Avatar label={me.user.displayUsername} portrait={me.avatar} size="lg" />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate font-display text-2xl leading-tight font-semibold">
            {me.user.displayUsername}
          </span>
          <span className="truncate text-sm text-muted">@{me.user.username}</span>
        </span>
        <Icon name="chevron-right" className="size-5 flex-none text-faint" />
      </Link>
      {currentLeague ? <LeagueScopeCard league={currentLeague} leagues={leagues} /> : null}
      <SettingsGroup title="Mon compte">
        <li>
          <Link to="/l/$leagueId/profile/photo" params={params} className={settingsRowClassName()}>
            <SettingsRowContent
              icon="photo"
              label="Photo de profil"
              value={me.avatar ? 'Définie' : 'Aucune'}
              hasChevron
            />
          </Link>
        </li>
        <li>
          <Link to="/l/$leagueId/profile/pseudo" params={params} className={settingsRowClassName()}>
            <SettingsRowContent
              icon="profile"
              label="Pseudo affiché"
              value={me.user.displayUsername}
              hasChevron
            />
          </Link>
        </li>
        <li>
          <Link
            to="/l/$leagueId/profile/connexion"
            params={params}
            className={settingsRowClassName()}
          >
            <SettingsRowContent
              icon="key"
              label="Connexion"
              hint="Passkeys · Mot de passe"
              value={arePasskeysReady ? String(passkeys.length) : undefined}
              hasChevron
            />
          </Link>
        </li>
      </SettingsGroup>
      <SettingsGroup title="Cet appareil">
        <li>
          <Link to="/l/$leagueId/profile/sons" params={params} className={settingsRowClassName()}>
            <SettingsRowContent
              icon="sound"
              label="Sons"
              hint="Booster · Interface · Volume"
              value={soundSummary(soundSettings)}
              hasChevron
            />
          </Link>
        </li>
        <li>
          <Link
            to="/l/$leagueId/profile/notifications"
            params={params}
            className={settingsRowClassName()}
          >
            <SettingsRowContent
              icon="bell"
              label="Notifications"
              hint="Boosters pleins, par ligue"
              value={push.isReady ? pushStatusSummary(push.status) : undefined}
              hasChevron
            />
          </Link>
        </li>
      </SettingsGroup>
      {errorMessage ? <Notice tone="error">{errorMessage}</Notice> : null}
      <Button variant="ghost" block isLoading={isPending} onClick={() => logout()}>
        Se déconnecter
      </Button>
      <SettingsGroup
        title="Zone sensible"
        footer={
          currentLeague?.role === 'owner' ? <OwnerLeaveHint leagueId={currentLeague.id} /> : null
        }
      >
        {currentLeague ? (
          <LeaveLeagueRow
            userId={me.user.id}
            displayUsername={me.user.displayUsername}
            league={currentLeague}
            isHomeLeague={me.homeLeagueId === currentLeague.id}
          />
        ) : null}
        <DeleteAccountRow userId={me.user.id} username={me.user.username} />
      </SettingsGroup>
    </main>
  )
}
