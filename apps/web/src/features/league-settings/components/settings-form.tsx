import { useState } from 'react'
import type { LeagueSettingsView, UpdateLeagueSettingsBody } from '@storix/shared'
import { Button } from '@/components/ui/button'
import { Chip } from '@/components/ui/chip'
import { Notice } from '@/components/ui/notice'
import { formatMinutes } from '../format-duration'
import { useLeagueSettings } from '../use-league-settings'
import { useRarityPreview } from '../use-rarity-preview'
import { WEIGHTS_ERROR, isValidSettings, validateSettings } from '../settings-errors'
import { DistributionPreview } from './distribution-preview'
import { NumberSetting } from './number-setting'
import { WeightSlider } from './weight-slider'

interface SettingsFormProps {
  leagueId: string
}

type Draft = UpdateLeagueSettingsBody

const DELAY_PRESETS = [
  { minutes: 0, label: '0' },
  { minutes: 60, label: '1 h' },
  { minutes: 720, label: '12 h' },
  { minutes: 1440, label: '24 h' },
] as const

function toDraft({ settings }: LeagueSettingsView): Draft {
  return {
    rarityWeights: settings.rarityWeights,
    booster: settings.booster,
    uploadQuotaPerDay: settings.uploadQuotaPerDay,
    newCardDelayMinutes: settings.newCardDelayMinutes,
  }
}

function isSameDraft(a: Draft, b: Draft): boolean {
  return (
    a.rarityWeights.uploaderScarcity === b.rarityWeights.uploaderScarcity &&
    a.rarityWeights.photoAge === b.rarityWeights.photoAge &&
    a.rarityWeights.reactions === b.rarityWeights.reactions &&
    a.booster.intervalMinutes === b.booster.intervalMinutes &&
    a.booster.maxStock === b.booster.maxStock &&
    a.booster.joinGift === b.booster.joinGift &&
    a.uploadQuotaPerDay === b.uploadQuotaPerDay &&
    a.newCardDelayMinutes === b.newCardDelayMinutes
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section aria-label={title} className="flex flex-col gap-3">
      <h2 className="m-0 font-display text-base font-semibold text-ink">{title}</h2>
      {children}
    </section>
  )
}

export function SettingsForm({ leagueId }: SettingsFormProps) {
  const { view, save, isSaving, isSaved, serverFieldErrors, errorMessage } =
    useLeagueSettings(leagueId)
  const [draft, setDraft] = useState<Draft>(() => toDraft(view))
  const { preview, isFetching } = useRarityPreview(leagueId, draft.rarityWeights)

  const errors = {
    ...serverFieldErrors,
    ...validateSettings(draft),
  }
  const isUnchanged = isSameDraft(draft, toDraft(view))
  const isValid = isValidSettings(draft)
  const hasWeightsError = errors.rarityWeights !== undefined
  const hasServerFieldError = Object.keys(errors).length > 0 && isValid

  const patch = (next: Partial<Draft>) => setDraft((current) => ({ ...current, ...next }))
  const patchBooster = (next: Partial<Draft['booster']>) =>
    setDraft((current) => ({ ...current, booster: { ...current.booster, ...next } }))
  const patchWeights = (next: Partial<Draft['rarityWeights']>) =>
    setDraft((current) => ({ ...current, rarityWeights: { ...current.rarityWeights, ...next } }))

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(event) => {
        event.preventDefault()
        if (isValid && !isUnchanged) save(draft)
      }}
    >
      <Section title="Boosters">
        <NumberSetting
          label="Un booster toutes les"
          unit="minutes"
          hint={`soit ${formatMinutes(draft.booster.intervalMinutes)}`}
          error={errors['booster.intervalMinutes']}
          value={draft.booster.intervalMinutes}
          min={1}
          max={10080}
          onChange={(intervalMinutes) => patchBooster({ intervalMinutes })}
        />
        <NumberSetting
          label="Stock maximum"
          error={errors['booster.maxStock']}
          value={draft.booster.maxStock}
          min={1}
          max={20}
          onChange={(maxStock) => patchBooster({ maxStock })}
        />
        <NumberSetting
          label="Cadeau d'arrivée"
          error={errors['booster.joinGift']}
          value={draft.booster.joinGift}
          min={0}
          max={20}
          onChange={(joinGift) => patchBooster({ joinGift })}
        />
      </Section>
      <Section title="Photos">
        <NumberSetting
          label="Photos par membre et par jour"
          error={errors.uploadQuotaPerDay}
          value={draft.uploadQuotaPerDay}
          min={1}
          max={50}
          onChange={(uploadQuotaPerDay) => patch({ uploadQuotaPerDay })}
        />
      </Section>
      <Section title="Nouvelles cartes">
        <NumberSetting
          label="Hors des boosters pendant"
          unit="minutes"
          hint={formatMinutes(draft.newCardDelayMinutes) || undefined}
          error={errors.newCardDelayMinutes}
          value={draft.newCardDelayMinutes}
          min={0}
          max={10080}
          onChange={(newCardDelayMinutes) => patch({ newCardDelayMinutes })}
        />
        <div className="flex flex-wrap gap-2">
          {DELAY_PRESETS.map(({ minutes, label }) => (
            <Chip
              key={minutes}
              label={label}
              isOn={draft.newCardDelayMinutes === minutes}
              onToggle={() => patch({ newCardDelayMinutes: minutes })}
            />
          ))}
        </div>
      </Section>
      <Section title="Rareté">
        <WeightSlider
          label="Auteur peu actif"
          value={draft.rarityWeights.uploaderScarcity}
          onChange={(uploaderScarcity) => patchWeights({ uploaderScarcity })}
        />
        <WeightSlider
          label="Ancienneté de la photo"
          value={draft.rarityWeights.photoAge}
          onChange={(photoAge) => patchWeights({ photoAge })}
        />
        <WeightSlider
          label="Réactions"
          value={draft.rarityWeights.reactions}
          onChange={(reactions) => patchWeights({ reactions })}
        />
        {hasWeightsError ? (
          <p role="alert" className="m-0 text-[13px] text-danger">
            {WEIGHTS_ERROR}
          </p>
        ) : (
          <DistributionPreview preview={preview} isFetching={isFetching} />
        )}
      </Section>
      <Section title="Mythiques">
        <p className="m-0 font-display text-sm font-semibold text-ink-2">
          {view.mythicCount} / {view.mythicCap}
        </p>
      </Section>
      {errorMessage && !hasServerFieldError ? <Notice tone="error">{errorMessage}</Notice> : null}
      {hasServerFieldError ? <Notice tone="error">Certains champs sont invalides.</Notice> : null}
      {isSaved && isUnchanged ? (
        <Notice tone="info">Réglages enregistrés. Les raretés sont en cours de recalcul.</Notice>
      ) : null}
      <Button
        type="submit"
        variant="primary"
        block
        isLoading={isSaving}
        disabled={!isValid || isUnchanged}
      >
        Enregistrer
      </Button>
    </form>
  )
}
