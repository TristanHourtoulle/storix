import type { ReactionCounts, ReactionType } from '@storix/shared'
import { Icon } from '@/components/ui/icon'

interface ReactionBarProps {
  reactions: ReactionCounts
  canReact: boolean
  onToggle: (type: ReactionType, isOn: boolean) => void
}

const REACTIONS: readonly { type: ReactionType; label: string }[] = [
  { type: 'fire', label: 'Feu' },
  { type: 'heart', label: 'Cœur' },
  { type: 'star', label: 'Étoile' },
]

export function ReactionBar({ reactions, canReact, onToggle }: ReactionBarProps) {
  return (
    <div className="reacts">
      {REACTIONS.map(({ type, label }) => {
        const { count, isMine } = reactions[type]
        return (
          <button
            key={type}
            type="button"
            className={isMine ? 'react on' : 'react'}
            aria-pressed={isMine}
            aria-label={`${label}, ${count} ${count > 1 ? 'réactions' : 'réaction'}`}
            disabled={!canReact}
            title={canReact ? undefined : 'Tu ne peux pas réagir à ta propre carte'}
            onClick={() => onToggle(type, !isMine)}
          >
            <Icon name={type} />
            <span aria-hidden="true">{count}</span>
          </button>
        )
      })}
    </div>
  )
}
