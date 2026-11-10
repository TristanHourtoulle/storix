import { useId, useRef, type KeyboardEvent } from 'react'
import { Link } from '@tanstack/react-router'
import type { CardReactor, Portrait, ReactionCounts, ReactionType } from '@storix/shared'
import { REACTION_TYPES } from '@storix/shared'
import { Avatar } from '@/components/ui/avatar'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { Icon } from '@/components/ui/icon'
import { reactedAgo, reactorName } from '../reactor-copy'

export type ReactionTab = ReactionType | 'all'

const REACTION_LABELS: Record<ReactionType, string> = {
  fire: 'Feu',
  heart: 'Cœur',
  star: 'Étoile',
}

const TABS: readonly ReactionTab[] = ['all', ...REACTION_TYPES]

function tabAfterKey(key: string, current: ReactionTab): ReactionTab | null {
  const index = TABS.indexOf(current)
  switch (key) {
    case 'ArrowRight':
      return TABS[(index + 1) % TABS.length] ?? null
    case 'ArrowLeft':
      return TABS[(index - 1 + TABS.length) % TABS.length] ?? null
    case 'Home':
      return TABS[0] ?? null
    case 'End':
      return TABS[TABS.length - 1] ?? null
    default:
      return null
  }
}

interface ReactionsSheetProps {
  open: boolean
  leagueId: string
  tab: ReactionTab
  onTabChange: (tab: ReactionTab) => void
  counts: ReactionCounts
  reactors: readonly CardReactor[] | undefined
  isLoading: boolean
  avatars: ReadonlyMap<string, Portrait>
  onClose: () => void
}

/** Bottom sheet listing who reacted to a card, one row per person, filterable by reaction type. */
export function ReactionsSheet({
  open,
  leagueId,
  tab,
  onTabChange,
  counts,
  reactors,
  isLoading,
  avatars,
  onClose,
}: ReactionsSheetProps) {
  const total = REACTION_TYPES.reduce((sum, type) => sum + counts[type].count, 0)
  const rows = (reactors ?? []).filter((reactor) => tab === 'all' || reactor.types.includes(tab))
  const baseId = useId()
  const tabRefs = useRef(new Map<ReactionTab, HTMLButtonElement>())
  const tabId = (value: ReactionTab) => `${baseId}-tab-${value}`
  const panelId = `${baseId}-panel`

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const next = tabAfterKey(event.key, tab)
    if (next === null) return
    event.preventDefault()
    onTabChange(next)
    tabRefs.current.get(next)?.focus()
  }

  return (
    <BottomSheet open={open} title={`Réactions · ${total}`} onClose={onClose}>
      <div
        className="rx-tabs"
        role="tablist"
        aria-label="Filtrer les réactions"
        onKeyDown={handleKeyDown}
      >
        {TABS.map((value) => {
          const isSelected = tab === value
          return (
            <button
              key={value}
              ref={(node) => {
                if (node) tabRefs.current.set(value, node)
                else tabRefs.current.delete(value)
              }}
              id={tabId(value)}
              type="button"
              role="tab"
              aria-selected={isSelected}
              aria-controls={panelId}
              tabIndex={isSelected ? 0 : -1}
              aria-label={
                value === 'all' ? undefined : `${REACTION_LABELS[value]}, ${counts[value].count}`
              }
              onClick={() => onTabChange(value)}
            >
              {value === 'all' ? (
                'Tous'
              ) : (
                <>
                  <Icon name={value} className="size-3.5" />
                  <span aria-hidden="true">{counts[value].count}</span>
                </>
              )}
            </button>
          )
        })}
      </div>
      <div id={panelId} role="tabpanel" aria-labelledby={tabId(tab)}>
        {isLoading ? (
          <p className="m-0 text-sm text-faint">Chargement…</p>
        ) : rows.length === 0 ? (
          <p className="m-0 text-sm text-faint">Personne n'a encore réagi.</p>
        ) : (
          <ul className="rx-people">
            {rows.map((reactor, index) => {
              const name = reactorName(reactor.person)
              const { userId } = reactor.person
              const identity = (
                <>
                  <Avatar
                    size="compact"
                    label={name}
                    portrait={userId ? (avatars.get(userId) ?? null) : null}
                  />
                  <div className="min-w-0">
                    <b>{name}</b>
                    <small>{reactedAgo(reactor.lastReactedAt)}</small>
                  </div>
                </>
              )
              return (
                <li key={userId ?? `former-${index}`} className="rx-person">
                  {userId ? (
                    <Link
                      to="/l/$leagueId/members/$userId"
                      params={{ leagueId, userId }}
                      className="rx-person-link"
                    >
                      {identity}
                    </Link>
                  ) : (
                    <span className="rx-person-link">{identity}</span>
                  )}
                  <span className="rx-chips">
                    {reactor.types.map((type) => (
                      <span key={type} className="rx-chip" title={REACTION_LABELS[type]}>
                        <Icon name={type} className="size-3" />
                      </span>
                    ))}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </BottomSheet>
  )
}
