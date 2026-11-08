import { useId, type ReactNode } from 'react'
import { Icon, type IconName } from './icon'

type RowTone = 'default' | 'danger' | 'disabled'

interface SettingsGroupProps {
  title: string
  footer?: ReactNode
  children: ReactNode
}

interface SettingsRowContentProps {
  icon: IconName
  label: string
  hint?: string
  value?: string
  tone?: RowTone
  hasChevron?: boolean
}

interface SettingsButtonRowProps extends SettingsRowContentProps {
  onClick: () => void
  children?: ReactNode
}

const ICON_TONES: Record<RowTone, string> = {
  default: 'bg-surface-2 text-accent',
  danger: 'bg-danger/15 text-danger',
  disabled: 'bg-surface-2 text-faint',
}

const LABEL_TONES: Record<RowTone, string> = {
  default: 'text-ink',
  danger: 'text-danger',
  disabled: 'text-faint',
}

/** Class names of a row inside a settings group, for links and buttons alike. */
export function settingsRowClassName(isInteractive = true): string {
  return `flex min-h-[52px] w-full items-center gap-3 border-0 bg-transparent px-3.5 py-2.5 text-left font-[inherit] text-ink no-underline ${isInteractive ? 'cursor-pointer hover:bg-surface-2 focus-visible:bg-surface-2' : 'cursor-default'}`
}

/** Grouped inset list with a title and an optional footnote. */
export function SettingsGroup({ title, footer, children }: SettingsGroupProps) {
  const titleId = useId()

  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-2">
      <h2
        id={titleId}
        className="px-1 font-sans text-xs font-semibold uppercase tracking-[0.06em] text-muted"
      >
        {title}
      </h2>
      <ul className="m-0 flex list-none flex-col divide-y divide-line overflow-hidden rounded-control bg-surface p-0 shadow-hairline">
        {children}
      </ul>
      {footer ? <div className="px-1 text-[13px] leading-snug text-muted">{footer}</div> : null}
    </section>
  )
}

/** Icon, label, hint and trailing value of a settings row. */
export function SettingsRowContent({
  icon,
  label,
  hint,
  value,
  tone = 'default',
  hasChevron = false,
}: SettingsRowContentProps) {
  return (
    <>
      <span
        aria-hidden="true"
        className={`grid size-[30px] flex-none place-items-center rounded-lg ${ICON_TONES[tone]}`}
      >
        <Icon name={icon} className="size-[17px]" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className={`truncate text-[15px] font-medium ${LABEL_TONES[tone]}`}>{label}</span>
        {hint ? <span className="truncate text-[13px] text-muted">{hint}</span> : null}
      </span>
      {value ? <span className="max-w-[40%] truncate text-sm text-muted">{value}</span> : null}
      {hasChevron ? (
        <Icon name="chevron-right" className="size-[18px] flex-none text-faint" />
      ) : null}
    </>
  )
}

/** Settings row that opens a dialog, rendered as children of the row. */
export function SettingsButtonRow({ onClick, children, ...content }: SettingsButtonRowProps) {
  return (
    <li>
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={onClick}
        className={settingsRowClassName()}
      >
        <SettingsRowContent {...content} />
      </button>
      {children}
    </li>
  )
}

/** Settings row shown for an action that is not available. */
export function SettingsDisabledRow(content: Omit<SettingsRowContentProps, 'tone'>) {
  return (
    <li>
      <button type="button" disabled className={settingsRowClassName(false)}>
        <SettingsRowContent {...content} tone="disabled" />
      </button>
    </li>
  )
}

interface SettingsSwitchRowProps {
  icon: IconName
  label: string
  hint?: string
  isOn: boolean
  isDisabled?: boolean
  onChange: (isOn: boolean) => void
}

/** Settings row toggling an on/off preference, exposed as an accessible switch. */
export function SettingsSwitchRow({
  icon,
  label,
  hint,
  isOn,
  isDisabled = false,
  onChange,
}: SettingsSwitchRowProps) {
  return (
    <li>
      <button
        type="button"
        role="switch"
        aria-checked={isOn}
        aria-disabled={isDisabled}
        onClick={() => {
          if (!isDisabled) onChange(!isOn)
        }}
        className={`${settingsRowClassName(!isDisabled)} aria-disabled:cursor-not-allowed aria-disabled:opacity-60`}
      >
        <SettingsRowContent icon={icon} label={label} hint={hint} />
        <span
          aria-hidden="true"
          className={`relative h-[26px] w-[44px] flex-none rounded-full transition-colors ${isOn ? 'bg-accent' : 'bg-surface-2 shadow-hairline-strong'}`}
        >
          <span
            className={`absolute top-[3px] left-[3px] size-5 rounded-full bg-ink transition-transform ${isOn ? 'translate-x-[18px]' : ''}`}
          />
        </span>
      </button>
    </li>
  )
}
