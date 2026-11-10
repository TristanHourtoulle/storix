interface SegmentedProps<T extends string> {
  options: readonly { id: T; label: string }[]
  value: T
  onChange: (id: T) => void
}

export function Segmented<T extends string>({ options, value, onChange }: SegmentedProps<T>) {
  return (
    <div className="flex rounded-control bg-surface p-1 shadow-hairline">
      {options.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          aria-pressed={value === id}
          onClick={() => onChange(id)}
          className={`h-10 flex-1 cursor-pointer appearance-none rounded-input border-0 font-display text-sm font-semibold ${value === id ? 'bg-line text-ink' : 'bg-transparent text-muted'}`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
