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

interface ReactionsSheetProps {
  open: boolean
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

  return (
    <BottomSheet open={open} title={`Réactions · ${total}`} onClose={onClose}>
      <div className="rx-tabs" role="group" aria-label="Filtrer les réactions">
        <button type="button" aria-pressed={tab === 'all'} onClick={() => onTabChange('all')}>
          Tous
        </button>
        {REACTION_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            aria-pressed={tab === type}
            aria-label={`${REACTION_LABELS[type]}, ${counts[type].count}`}
            onClick={() => onTabChange(type)}
          >
            <Icon name={type} className="size-3.5" />
            <span aria-hidden="true">{counts[type].count}</span>
          </button>
        ))}
      </div>
      {isLoading ? (
        <p className="m-0 text-sm text-faint">Chargement…</p>
      ) : rows.length === 0 ? (
        <p className="m-0 text-sm text-faint">Personne n'a encore réagi.</p>
      ) : (
        <ul className="rx-people">
          {rows.map((reactor, index) => {
            const name = reactorName(reactor.person)
            return (
              <li key={reactor.person.userId ?? `former-${index}`} className="rx-person">
                <Avatar
                  size="compact"
                  label={name}
                  portrait={
                    reactor.person.userId ? (avatars.get(reactor.person.userId) ?? null) : null
                  }
                />
                <div className="min-w-0">
                  <b>{name}</b>
                  <small>{reactedAgo(reactor.lastReactedAt)}</small>
                </div>
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
    </BottomSheet>
  )
}
