import type { Portrait } from '@storix/shared'
import { PortraitImage, useVisiblePortrait } from './portrait-image'

interface ChipProps {
  label: string
  initials?: string
  portrait?: Portrait | null
  dotColor?: string
  isOn: boolean
  isDisabled?: boolean
  onToggle: () => void
}

export function Chip({
  label,
  initials,
  portrait = null,
  dotColor,
  isOn,
  isDisabled = false,
  onToggle,
}: ChipProps) {
  const { visible, markFailed } = useVisiblePortrait(portrait)
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
          className={`grid size-8 place-items-center overflow-hidden rounded-full font-display text-[11px] font-semibold shadow-hairline-strong ${isOn ? 'bg-bg text-ink' : 'bg-surface-2 text-ink-3'}`}
        >
          {visible ? (
            <PortraitImage
              portrait={visible}
              sizes="32px"
              onError={markFailed}
              className="size-full rounded-full object-cover"
            />
          ) : (
            initials
          )}
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
