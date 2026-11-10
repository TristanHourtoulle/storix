import type { ReactionCounts, ReactionType } from '@storix/shared'
import { Icon } from '@/components/ui/icon'
import { playSound } from '@/features/sound/sound'
import type { ReactionSound } from '@/features/sound/sound-types'

interface ReactionBarProps {
  reactions: ReactionCounts
  canReact: boolean
  onToggle: (type: ReactionType, isOn: boolean) => void
  onOpenReactors?: (type: ReactionType) => void
}

const REACTIONS: readonly { type: ReactionType; label: string; sound: ReactionSound }[] = [
  { type: 'fire', label: 'Feu', sound: 'reactFire' },
  { type: 'heart', label: 'Cœur', sound: 'reactHeart' },
  { type: 'star', label: 'Étoile', sound: 'reactStar' },
]

/**
 * The three reaction counters. Members who can react toggle their reaction; the author, who can't,
 * opens the list of who reacted instead when `onOpenReactors` is given.
 */
export function ReactionBar({ reactions, canReact, onToggle, onOpenReactors }: ReactionBarProps) {
  const opensReactors = !canReact && onOpenReactors !== undefined
  return (
    <div className="reacts">
      {REACTIONS.map(({ type, label, sound }) => {
        const { count, isMine } = reactions[type]
        return (
          <button
            key={type}
            type="button"
            className={isMine ? 'react on' : 'react'}
            aria-pressed={opensReactors ? undefined : isMine}
            aria-haspopup={opensReactors ? 'dialog' : undefined}
            aria-label={`${label}, ${count} ${count > 1 ? 'réactions' : 'réaction'}`}
            disabled={!canReact && !opensReactors}
            title={
              canReact || opensReactors ? undefined : 'Tu ne peux pas réagir à ta propre carte'
            }
            onClick={() => {
              if (opensReactors) {
                onOpenReactors(type)
                return
              }
              if (!isMine) playSound({ name: sound })
              onToggle(type, !isMine)
            }}
          >
            <Icon name={type} />
            <span aria-hidden="true">{count}</span>
          </button>
        )
      })}
    </div>
  )
}
