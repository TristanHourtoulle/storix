interface CollectionProgressProps {
  owned: number
  total: number
  label: string
}

export function CollectionProgress({ owned, total, label }: CollectionProgressProps) {
  const percent = total > 0 ? Math.min(100, (owned / total) * 100) : 0

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <p className="m-0 font-display text-sm font-semibold text-ink-3">{label}</p>
        <span className="count-big">
          <strong>{owned}</strong> / {total}
        </span>
      </div>
      <div
        className="bar"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={owned}
      >
        <div className="bar-fill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}
