import { useId } from 'react'
import { SettingsGroup, SettingsSwitchRow } from '@/components/ui/settings-list'
import { previewSound } from '../sound'
import { updateSoundSettings, useSoundSettings } from '../sound-settings'

export function SoundSettingsSection() {
  const { isBoosterEnabled, isInterfaceEnabled, volume } = useSoundSettings()
  const volumeId = useId()
  const isMuted = !isBoosterEnabled && !isInterfaceEnabled

  return (
    <>
      <SettingsGroup
        title="Sons"
        footer="Réglages enregistrés sur cet appareil. Sur iPhone, le bouton silence coupe aussi les sons."
      >
        <SettingsSwitchRow
          icon="sound"
          label="Sons du booster"
          hint="Ouverture, révélation, récapitulatif"
          isOn={isBoosterEnabled}
          onChange={(isOn) => updateSoundSettings({ isBoosterEnabled: isOn })}
        />
        <SettingsSwitchRow
          icon="check"
          label="Sons de l'interface"
          hint="Boutons, réactions, ajout de photos"
          isOn={isInterfaceEnabled}
          onChange={(isOn) => updateSoundSettings({ isInterfaceEnabled: isOn })}
        />
      </SettingsGroup>
      <SettingsGroup title="Volume">
        <li className="flex min-h-[52px] items-center gap-3 px-3.5 py-2.5">
          <label htmlFor={volumeId} className="sr-only">
            Volume
          </label>
          <input
            id={volumeId}
            type="range"
            min={0}
            max={100}
            step={5}
            value={volume}
            disabled={isMuted}
            onChange={(event) => updateSoundSettings({ volume: Number(event.target.value) })}
            onPointerUp={previewSound}
            onKeyUp={previewSound}
            className="h-6 min-w-0 flex-1 cursor-pointer accent-accent disabled:cursor-not-allowed disabled:opacity-50"
          />
          <span className="w-12 text-right text-sm text-muted tabular-nums">{volume} %</span>
        </li>
      </SettingsGroup>
    </>
  )
}
