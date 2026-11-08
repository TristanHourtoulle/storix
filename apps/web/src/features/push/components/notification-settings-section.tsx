import { Notice } from '@/components/ui/notice'
import {
  SettingsDisabledRow,
  SettingsGroup,
  SettingsSwitchRow,
} from '@/components/ui/settings-list'
import type { PushStatus } from '../push-status'
import { usePushNotifications } from '../use-push-notifications'

const FOOTER =
  'Une notification par ligue quand ton stock de boosters est plein. Réglage enregistré sur cet appareil.'

const INSTALL_NOTICE =
  "Sur iPhone, les notifications ne marchent que depuis l'app installée. Dans Safari, touche Partager puis « Sur l'écran d'accueil », puis ouvre Storix depuis l'icône."

const DISABLED_HINTS: Record<Exclude<PushStatus, 'enabled' | 'disabled'>, string> = {
  denied: 'Bloquées dans les réglages du navigateur',
  unsupported: 'Non prises en charge par ce navigateur',
  unavailable: 'Indisponibles pour le moment',
  'needs-install': "Ajoute Storix à l'écran d'accueil",
}

export function NotificationSettingsSection() {
  const { status, isReady, enable, disable, isPending, errorMessage } = usePushNotifications()
  const isSwitchable = status === 'enabled' || status === 'disabled'

  return (
    <>
      <SettingsGroup title="Notifications" footer={FOOTER}>
        {isSwitchable ? (
          <SettingsSwitchRow
            icon="bell"
            label="Boosters pleins"
            hint={
              status === 'enabled' ? 'Activées sur cet appareil' : 'Désactivées sur cet appareil'
            }
            isOn={status === 'enabled'}
            isDisabled={isPending || !isReady}
            onChange={(isOn) => {
              void (isOn ? enable() : disable())
            }}
          />
        ) : (
          <SettingsDisabledRow icon="bell" label="Boosters pleins" hint={DISABLED_HINTS[status]} />
        )}
      </SettingsGroup>
      {status === 'needs-install' ? <Notice tone="info">{INSTALL_NOTICE}</Notice> : null}
      {errorMessage ? <Notice tone="error">{errorMessage}</Notice> : null}
    </>
  )
}
