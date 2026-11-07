interface ChipProps {
  label: string
  initials?: string
  isOn: boolean
  onToggle: () => void
}

export function Chip({ label, initials, isOn, onToggle }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={isOn}
      onClick={onToggle}
      className={`inline-flex h-11 flex-none cursor-pointer appearance-none items-center gap-2 whitespace-nowrap rounded-full border-0 font-sans text-sm font-medium shadow-hairline ${initials ? 'pr-3.5 pl-1.5' : 'px-4'} ${isOn ? 'bg-ink text-bg' : 'bg-surface text-ink-2'}`}
    >
      {initials ? (
        <span
          aria-hidden="true"
          className={`grid size-8 place-items-center rounded-full font-display text-[11px] font-semibold shadow-hairline-strong ${isOn ? 'bg-bg text-ink' : 'bg-surface-2 text-ink-3'}`}
        >
          {initials}
        </span>
      ) : null}
      {label}
    </button>
  )
}
