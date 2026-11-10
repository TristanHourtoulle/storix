import { emblemDefinition, FEATURED_EMBLEMS_MAX, type EmblemProgressView } from '@storix/shared'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { Notice } from '@/components/ui/notice'
import { tierColorStyle } from '@/features/members/member-copy'
import { TIER_LABELS } from '@/features/cards/tier-labels'
import { earnedSentence, isUpcoming } from '../emblem-copy'
import { EmblemIcon } from './emblem-icon'

interface EmblemSheetProps {
  emblem: EmblemProgressView | null
  canFeature: boolean
  featuredCount: number
  isSaving: boolean
  hasError: boolean
  onToggleFeatured: (emblem: EmblemProgressView) => void
  onClose: () => void
}

function statusOf(emblem: EmblemProgressView): string {
  if (emblem.isEarned) return earnedSentence(emblem.earnedAt ?? new Date().toISOString())
  if (isUpcoming(emblem)) return 'Pas encore'
  return `${emblem.progress} / ${emblem.target}`
}

/** Bottom sheet detailing one emblem: its rule, date or progress, and the "Mettre en avant" switch. */
export function EmblemSheet({
  emblem,
  canFeature,
  featuredCount,
  isSaving,
  hasError,
  onToggleFeatured,
  onClose,
}: EmblemSheetProps) {
  const definition = emblem ? emblemDefinition(emblem.id) : null

  return (
    <BottomSheet open={emblem !== null} title={definition?.name ?? 'Emblème'} onClose={onClose}>
      {emblem && definition ? (
        <>
          <div className="edetail" style={tierColorStyle(definition.tier)}>
            <span
              className={`edetail-hex${emblem.isEarned ? '' : ' off'}${definition.tier === 'mythic' && emblem.isEarned ? ' t-M' : ''}`}
            >
              <EmblemIcon id={emblem.id} className="edetail-glyph" />
            </span>
            <p>{definition.rule}</p>
            <small>
              {TIER_LABELS[definition.tier]} · {statusOf(emblem)}
            </small>
          </div>
          {canFeature && emblem.isEarned ? (
            <FeatureSwitch
              isOn={emblem.featuredRank !== null}
              isFull={emblem.featuredRank === null && featuredCount >= FEATURED_EMBLEMS_MAX}
              isSaving={isSaving}
              onToggle={() => onToggleFeatured(emblem)}
            />
          ) : null}
          {hasError ? <Notice tone="error">Action impossible. Réessaie.</Notice> : null}
        </>
      ) : null}
    </BottomSheet>
  )
}

interface FeatureSwitchProps {
  isOn: boolean
  isFull: boolean
  isSaving: boolean
  onToggle: () => void
}

function FeatureSwitch({ isOn, isFull, isSaving, onToggle }: FeatureSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={isOn}
      disabled={isFull || isSaving}
      className="filter-switch"
      onClick={onToggle}
    >
      <span className="filter-switch-text">
        <b>Mettre en avant</b>
        <span>
          {isFull
            ? `Déjà ${FEATURED_EMBLEMS_MAX} emblèmes en avant : retires-en un d'abord.`
            : `Dans l'en-tête de ta page, ${FEATURED_EMBLEMS_MAX} au maximum.`}
        </span>
      </span>
      <span aria-hidden="true" className="filter-switch-track" />
    </button>
  )
}
