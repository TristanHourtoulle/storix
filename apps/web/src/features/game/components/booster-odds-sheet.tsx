import {
  BOOSTER_SLOTS,
  CARD_TIERS,
  FOIL_ODDS,
  PITY_EPIC_AFTER,
  PITY_LEGENDARY_AFTER,
  PREMIUM_BOOSTER_EVERY,
  PREMIUM_BOOSTER_SLOTS,
  slotOddsPercent,
  type TierWeights,
} from '@storix/shared'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { TIER_CLASS, TIER_LABELS } from '@/features/cards/tier-labels'

interface BoosterOddsSheetProps {
  isOpen: boolean
  onClose: () => void
}

interface SlotGroup {
  label: string
  weights: TierWeights
}

function slotGroups(slots: readonly TierWeights[]): SlotGroup[] {
  const [first, , , fourth, fifth] = slots
  if (first === undefined || fourth === undefined || fifth === undefined) return []
  return [
    { label: 'Cartes 1 à 3', weights: first },
    { label: 'Carte 4', weights: fourth },
    { label: 'Carte 5', weights: fifth },
  ]
}

const percentFormat = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 })

function OddsSection({ title, slots }: { title: string; slots: readonly TierWeights[] }) {
  return (
    <section className="odds-section">
      <h3 className="filter-label">{title}</h3>
      {slotGroups(slots).map((group) => {
        const odds = slotOddsPercent(group.weights)
        return (
          <div key={group.label} className="odds-row">
            <span className="odds-slot">{group.label}</span>
            <ul className="odds-pills">
              {CARD_TIERS.flatMap((tier) => {
                const percent = odds[tier]
                return percent === undefined
                  ? []
                  : [
                      <li key={tier} className={`odds-pill ${TIER_CLASS[tier]}`}>
                        <span className="odds-pill-dot" aria-hidden="true" />
                        {TIER_LABELS[tier]} <b>{percentFormat.format(percent)} %</b>
                      </li>,
                    ]
              })}
            </ul>
          </div>
        )
      })}
    </section>
  )
}

/** Bottom sheet listing the drop odds of classic and premium boosters, per slot. */
export function BoosterOddsSheet({ isOpen, onClose }: BoosterOddsSheetProps) {
  return (
    <BottomSheet open={isOpen} title="Probabilités" onClose={onClose}>
      <OddsSection title="Booster classique" slots={BOOSTER_SLOTS} />
      <OddsSection
        title={`Booster premium · 1 sur ${PREMIUM_BOOSTER_EVERY}`}
        slots={PREMIUM_BOOSTER_SLOTS}
      />
      <ul className="odds-notes">
        <li>Épique garantie au plus tard au {PITY_EPIC_AFTER}e booster sans Épique.</li>
        <li>
          Après {PITY_LEGENDARY_AFTER} boosters sans Légendaire, ses chances augmentent d'un point
          par booster.
        </li>
        <li>
          Si ta ligue n'a pas encore de carte de la rareté tirée, tu reçois la meilleure disponible.
        </li>
        <li>Chaque carte a 1 chance sur {FOIL_ODDS} d'être brillante.</li>
      </ul>
    </BottomSheet>
  )
}
