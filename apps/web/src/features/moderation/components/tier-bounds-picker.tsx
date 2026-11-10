import { BOUND_TIERS, type BoundTier } from '@storix/shared'
import { Chip } from '@/components/ui/chip'
import { TIER_COLOR_VAR, TIER_LABELS } from '@/features/cards/tier-labels'

function rank(tier: BoundTier): number {
  return BOUND_TIERS.indexOf(tier)
}

interface TierBoundsPickerProps {
  min: BoundTier | null
  max: BoundTier | null
  isPinned: boolean
  isBusy: boolean
  onChange: (bounds: { min: BoundTier | null; max: BoundTier | null }) => void
}

interface BoundRowProps {
  label: string
  value: BoundTier | null
  isDisabled: boolean
  isTierDisabled: (tier: BoundTier) => boolean
  onSelect: (tier: BoundTier | null) => void
}

function BoundRow({ label, value, isDisabled, isTierDisabled, onSelect }: BoundRowProps) {
  return (
    <div role="group" aria-label={label} className="flex flex-col gap-1.5">
      <span className="font-display text-xs font-semibold text-ink-3">{label}</span>
      <div className="picker-row">
        <Chip
          label="Aucun"
          isOn={value === null}
          isDisabled={isDisabled}
          onToggle={() => onSelect(null)}
        />
        {BOUND_TIERS.map((tier) => (
          <Chip
            key={tier}
            label={TIER_LABELS[tier]}
            dotColor={TIER_COLOR_VAR[tier]}
            isOn={value === tier}
            isDisabled={isDisabled || isTierDisabled(tier)}
            onToggle={() => onSelect(tier)}
          />
        ))}
      </div>
    </div>
  )
}

export function TierBoundsPicker({ min, max, isPinned, isBusy, onChange }: TierBoundsPickerProps) {
  const isDisabled = isPinned || isBusy

  return (
    <section aria-label="Bornes de rareté" className="flex flex-col gap-3">
      <h3 className="m-0 font-display text-sm font-semibold">Bornes de rareté</h3>
      <BoundRow
        label="Minimum"
        value={min}
        isDisabled={isDisabled}
        isTierDisabled={(tier) => max !== null && rank(tier) > rank(max)}
        onSelect={(tier) => onChange({ min: tier, max })}
      />
      <BoundRow
        label="Maximum"
        value={max}
        isDisabled={isDisabled}
        isTierDisabled={(tier) => min !== null && rank(tier) < rank(min)}
        onSelect={(tier) => onChange({ min, max: tier })}
      />
      {isPinned ? <p className="picker-note">Ignorées : rareté fixée</p> : null}
    </section>
  )
}
