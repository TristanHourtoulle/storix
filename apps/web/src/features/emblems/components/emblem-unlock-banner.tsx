import { emblemDefinition, type EmblemId } from '@storix/shared'
import { tierColorStyle } from '@/features/members/member-copy'
import { EmblemIcon } from './emblem-icon'

interface EmblemUnlockBannerProps {
  emblemIds: readonly EmblemId[]
  isShown: boolean
  onOpen: () => void
}

/** Top banner announcing one named emblem, or a count when several unlocked together. */
export function EmblemUnlockBanner({ emblemIds, isShown, onOpen }: EmblemUnlockBannerProps) {
  const first = emblemIds[0]
  if (first === undefined) return null
  const definition = emblemDefinition(first)
  const isSingle = emblemIds.length === 1

  return (
    <div className="eunlock-wrap" aria-live="polite">
      <button
        type="button"
        className={`eunlock${isShown ? ' is-shown' : ''}`}
        style={tierColorStyle(definition.tier)}
        tabIndex={isShown ? 0 : -1}
        aria-hidden={!isShown}
        onClick={onOpen}
      >
        <span className={`eunlock-hex${definition.tier === 'mythic' ? ' t-M' : ''}`}>
          <EmblemIcon id={first} className="eunlock-glyph" />
        </span>
        <span className="min-w-0 text-left">
          <span className="eunlock-ey">{isSingle ? 'Emblème débloqué' : 'Emblèmes débloqués'}</span>
          <b>{isSingle ? definition.name : `Tu as débloqué ${emblemIds.length} emblèmes`}</b>
          <small>{isSingle ? definition.rule : 'Touche pour les voir.'}</small>
        </span>
      </button>
    </div>
  )
}
