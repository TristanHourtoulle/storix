interface TabBarProps<T extends string> {
  label: string
  options: readonly { id: T; label: string; hasDot?: boolean }[]
  value: T
  onChange: (id: T) => void
}

/** A flat row of equal tabs; the active one is raised. A dot flags a tab that needs attention. */
export function TabBar<T extends string>({ label, options, value, onChange }: TabBarProps<T>) {
  return (
    <div role="tablist" aria-label={label} className="tab-bar">
      {options.map(({ id, label: tabLabel, hasDot = false }) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={value === id}
          onClick={() => onChange(id)}
          className="tab-bar-tab"
        >
          {tabLabel}
          {hasDot ? (
            <>
              <span className="sr-only">, nouvelle alerte</span>
              <span aria-hidden="true" className="tab-bar-dot" />
            </>
          ) : null}
        </button>
      ))}
    </div>
  )
}
