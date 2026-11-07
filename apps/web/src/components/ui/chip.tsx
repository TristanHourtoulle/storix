interface ChipProps {
  label: string
  initials?: string
  dotColor?: string
  isOn: boolean
  isDisabled?: boolean
  onToggle: () => void
}

export function Chip({ label, initials, dotColor, isOn, isDisabled = false, onToggle }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={isOn}
      disabled={isDisabled}
      onClick={onToggle}
      className={`inline-flex h-11 flex-none cursor-pointer appearance-none items-center gap-2 whitespace-nowrap rounded-full border-0 font-sans text-sm font-medium shadow-hairline disabled:cursor-not-allowed disabled:opacity-60 ${initials ? 'pr-3.5 pl-1.5' : 'px-4'} ${isOn ? 'bg-ink text-bg' : 'bg-surface text-ink-2'}`}
    >
      {initials ? (
        <span
          aria-hidden="true"
          className={`grid size-8 place-items-center rounded-full font-display text-[11px] font-semibold shadow-hairline-strong ${isOn ? 'bg-bg text-ink' : 'bg-surface-2 text-ink-3'}`}
        >
          {initials}
        </span>
      ) : null}
      {dotColor ? (
        <span
          aria-hidden="true"
          className="size-2 flex-none rounded-full"
          style={{ backgroundColor: dotColor }}
        />
      ) : null}
      {label}
    </button>
  )
}
