import { CARD_TIERS, type RarityPreview } from '@storix/shared'
import { TIER_COLOR_VAR, TIER_LABELS } from '@/features/cards/tier-labels'

interface DistributionPreviewProps {
  preview: RarityPreview | undefined
  isFetching: boolean
  isError?: boolean
}

function barWidth(count: number, max: number): string {
  return max > 0 ? `${Math.max((count / max) * 100, count > 0 ? 3 : 0)}%` : '0%'
}

export function DistributionPreview({
  preview,
  isFetching,
  isError = false,
}: DistributionPreviewProps) {
  if (!preview || isError) {
    return <p className="m-0 text-[13px] text-faint">Aperçu indisponible.</p>
  }
  const max = Math.max(
    ...CARD_TIERS.flatMap((tier) => [preview.current[tier], preview.preview[tier]]),
  )

  return (
    <div className={`flex flex-col gap-3 transition-opacity ${isFetching ? 'opacity-70' : ''}`}>
      <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
        {CARD_TIERS.map((tier) => (
          <li key={tier} className="flex flex-col gap-1">
            <span
              className="font-display text-xs font-semibold"
              style={{ color: TIER_COLOR_VAR[tier] }}
            >
              {TIER_LABELS[tier]}
            </span>
            <DistributionBar
              label="Actuel"
              count={preview.current[tier]}
              width={barWidth(preview.current[tier], max)}
              color="var(--color-line-strong)"
            />
            <DistributionBar
              label="Après"
              count={preview.preview[tier]}
              width={barWidth(preview.preview[tier], max)}
              color={TIER_COLOR_VAR[tier]}
            />
          </li>
        ))}
      </ul>
      <p className="m-0 font-display text-sm font-semibold text-ink-2">
        {preview.changed === 0
          ? 'Aucune carte ne change'
          : preview.changed === 1
            ? '1 carte changerait de rareté'
            : `${preview.changed} cartes changeraient de rareté`}
      </p>
    </div>
  )
}

interface DistributionBarProps {
  label: string
  count: number
  width: string
  color: string
}

function DistributionBar({ label, count, width, color }: DistributionBarProps) {
  return (
    <div className="flex items-center gap-2 text-xs text-muted">
      <span className="w-12 flex-none">{label}</span>
      <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-2">
        <div
          className="h-full rounded-full transition-[width] duration-200"
          style={{ width, backgroundColor: color }}
        />
      </div>
      <span className="w-8 flex-none text-right tabular-nums text-ink-3">{count}</span>
    </div>
  )
}
