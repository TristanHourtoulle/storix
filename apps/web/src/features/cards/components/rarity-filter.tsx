import { CARD_TIERS, type CardTier } from '@storix/shared'
import { TIER_CLASS, TIER_LABELS } from '../tier-labels'

interface RarityFilterProps {
  selected: CardTier | null
  onSelect: (tier: CardTier | null) => void
}

const CHIP_BASE =
  'inline-flex h-11 flex-none cursor-pointer appearance-none items-center gap-2 whitespace-nowrap rounded-full border-0 px-4 font-sans text-sm font-medium shadow-hairline'

export function RarityFilter({ selected, onSelect }: RarityFilterProps) {
  return (
    <div
      role="group"
      aria-label="Filtrer par rareté"
      className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none]"
    >
      <button
        type="button"
        aria-pressed={selected === null}
        onClick={() => onSelect(null)}
        className={`${CHIP_BASE} ${selected === null ? 'bg-ink text-bg' : 'bg-surface text-ink-2'}`}
      >
        Toutes
      </button>
      {CARD_TIERS.map((tier) => {
        const isOn = selected === tier
        return (
          <button
            key={tier}
            type="button"
            aria-pressed={isOn}
            onClick={() => onSelect(isOn ? null : tier)}
            className={`${CHIP_BASE} ${isOn ? 'bg-ink text-bg' : 'bg-surface text-ink-2'}`}
          >
            <span aria-hidden="true" className={`tier-dot ${TIER_CLASS[tier]}`} />
            {TIER_LABELS[tier]}
          </button>
        )
      })}
    </div>
  )
}
