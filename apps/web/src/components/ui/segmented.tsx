interface SegmentedProps<T extends string> {
  options: readonly { id: T; label: string; hasDot?: boolean }[]
  value: T
  onChange: (id: T) => void
}

export function Segmented<T extends string>({ options, value, onChange }: SegmentedProps<T>) {
  return (
    <div className="flex rounded-control bg-surface p-1 shadow-hairline">
      {options.map(({ id, label, hasDot = false }) => (
        <button
          key={id}
          type="button"
          aria-pressed={value === id}
          onClick={() => onChange(id)}
          className={`relative h-10 flex-1 cursor-pointer appearance-none rounded-input border-0 font-display text-sm font-semibold ${value === id ? 'bg-line text-ink' : 'bg-transparent text-muted'}`}
        >
          {label}
          {hasDot ? (
            <>
              <span className="sr-only">, nouvelle alerte</span>
              <span
                aria-hidden="true"
                className="absolute top-1.5 right-1.5 size-2 rounded-full bg-danger shadow-[0_0_0_2px_var(--color-surface)]"
              />
            </>
          ) : null}
        </button>
      ))}
    </div>
  )
}
