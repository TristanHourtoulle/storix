import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react'

export const MEMBER_TABS = ['photos', 'tagged', 'emblems'] as const

export type MemberTab = (typeof MEMBER_TABS)[number]

interface MemberTabsProps {
  labels: Record<MemberTab, string>
  counts: Record<MemberTab, number>
  selected: MemberTab
  onSelect: (tab: MemberTab) => void
  children: ReactNode
}

function tabAfterKey(key: string, current: MemberTab): MemberTab | null {
  const index = MEMBER_TABS.indexOf(current)
  switch (key) {
    case 'ArrowRight':
      return MEMBER_TABS[(index + 1) % MEMBER_TABS.length] ?? null
    case 'ArrowLeft':
      return MEMBER_TABS[(index - 1 + MEMBER_TABS.length) % MEMBER_TABS.length] ?? null
    case 'Home':
      return MEMBER_TABS[0]
    case 'End':
      return MEMBER_TABS[MEMBER_TABS.length - 1] ?? null
    default:
      return null
  }
}

/** Pill tabs of the member page with arrow-key navigation; renders the selected panel below. */
export function MemberTabs({ labels, counts, selected, onSelect, children }: MemberTabsProps) {
  const baseId = useId()
  const tabRefs = useRef(new Map<MemberTab, HTMLButtonElement>())
  const tabId = (tab: MemberTab) => `${baseId}-tab-${tab}`
  const panelId = `${baseId}-panel`

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const next = tabAfterKey(event.key, selected)
    if (next === null) return
    event.preventDefault()
    onSelect(next)
    tabRefs.current.get(next)?.focus()
  }

  return (
    <>
      <div className="mpage-tabs" role="tablist" aria-label="Sections" onKeyDown={handleKeyDown}>
        {MEMBER_TABS.map((tab) => {
          const isSelected = tab === selected
          return (
            <button
              key={tab}
              ref={(node) => {
                if (node) tabRefs.current.set(tab, node)
                else tabRefs.current.delete(tab)
              }}
              id={tabId(tab)}
              data-tab={tab}
              type="button"
              role="tab"
              aria-selected={isSelected}
              aria-controls={panelId}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => onSelect(tab)}
            >
              <span className="mpage-tab-label">{labels[tab]}</span>
              <span className="mpage-tab-count">{counts[tab]}</span>
            </button>
          )
        })}
      </div>
      <div id={panelId} role="tabpanel" aria-labelledby={tabId(selected)} className="mpage-panel">
        {children}
      </div>
    </>
  )
}
