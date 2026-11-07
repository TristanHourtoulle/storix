import { CARD_TIERS, MYTHIC_CAP, type CardTier } from '@storix/shared'
import { Chip } from '@/components/ui/chip'
import { TIER_COLOR_VAR, TIER_LABELS } from '@/features/cards/tier-labels'

interface TierPinPickerProps {
  pinnedTier: CardTier | null
  mythicCount: number
  isBusy: boolean
  onChange: (tier: CardTier | null) => void
}

export function TierPinPicker({ pinnedTier, mythicCount, isBusy, onChange }: TierPinPickerProps) {
  const isMythicFull = mythicCount >= MYTHIC_CAP && pinnedTier !== 'mythic'

  return (
    <section aria-label="Rareté fixée" className="flex flex-col gap-2">
      <h3 className="m-0 font-display text-sm font-semibold">Rareté fixée</h3>
      <div className="picker-row">
        <Chip
          label="Auto"
          isOn={pinnedTier === null}
          isDisabled={isBusy}
          onToggle={() => onChange(null)}
        />
        {CARD_TIERS.map((tier) => {
          const isLocked = tier === 'mythic' && isMythicFull
          return (
            <Chip
              key={tier}
              label={isLocked ? `${mythicCount} / ${MYTHIC_CAP} Mythiques` : TIER_LABELS[tier]}
              dotColor={TIER_COLOR_VAR[tier]}
              isOn={pinnedTier === tier}
              isDisabled={isBusy || isLocked}
              onToggle={() => onChange(tier)}
            />
          )
        })}
      </div>
    </section>
  )
}
