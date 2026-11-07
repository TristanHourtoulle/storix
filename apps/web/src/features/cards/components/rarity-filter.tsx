import { CARD_TIERS, type CardTier } from '@storix/shared'
import { Chip } from '@/components/ui/chip'
import { TIER_COLOR_VAR, TIER_LABELS } from '../tier-labels'

interface RarityFilterProps {
  selected: CardTier | null
  onSelect: (tier: CardTier | null) => void
}

export function RarityFilter({ selected, onSelect }: RarityFilterProps) {
  return (
    <div
      role="group"
      aria-label="Filtrer par rareté"
      className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none]"
    >
      <Chip label="Toutes" isOn={selected === null} onToggle={() => onSelect(null)} />
      {CARD_TIERS.map((tier) => (
        <Chip
          key={tier}
          label={TIER_LABELS[tier]}
          dotColor={TIER_COLOR_VAR[tier]}
          isOn={selected === tier}
          onToggle={() => onSelect(selected === tier ? null : tier)}
        />
      ))}
    </div>
  )
}
