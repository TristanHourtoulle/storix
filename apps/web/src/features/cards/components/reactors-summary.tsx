import type { CardReactor, CosmeticItemId, Portrait } from '@storix/shared'
import { Avatar } from '@/components/ui/avatar'
import { reactorName, reactorsSummary } from '../reactor-copy'

const STACK_SIZE = 3

interface ReactorsSummaryProps {
  reactors: readonly CardReactor[]
  avatars: ReadonlyMap<string, Portrait>
  frames: ReadonlyMap<string, CosmeticItemId>
  onOpen: () => void
}

/** "Léa, Tom et 3 autres ont réagi" with up to three stacked avatars, opening the reactions sheet. */
export function ReactorsSummary({ reactors, avatars, frames, onOpen }: ReactorsSummaryProps) {
  if (reactors.length === 0) return null
  const names = reactors.map((reactor) => reactorName(reactor.person))
  return (
    <button type="button" className="reactors-summary" onClick={onOpen}>
      <span className="reactors-stack" aria-hidden="true">
        {reactors.slice(0, STACK_SIZE).map((reactor, index) => (
          <Avatar
            key={reactor.person.userId ?? `former-${index}`}
            size="xs"
            label={reactorName(reactor.person)}
            portrait={reactor.person.userId ? (avatars.get(reactor.person.userId) ?? null) : null}
            frame={reactor.person.userId ? (frames.get(reactor.person.userId) ?? null) : null}
          />
        ))}
      </span>
      {reactorsSummary(names)}
    </button>
  )
}
