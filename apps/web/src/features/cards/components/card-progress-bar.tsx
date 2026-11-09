import type { Ref } from 'react'
import type { CardProgression } from '@storix/shared'
import { Icon, type IconName } from '@/components/ui/icon'
import { nextTierTone, progressionButtonLabel } from '../progression-copy'
import { BarGauges, MaxedBox } from './progression-gauges'

interface CardProgressBarProps {
  progression: CardProgression
  isBusy: boolean
  mainRef: Ref<HTMLButtonElement>
  moreRef: Ref<HTMLButtonElement>
  onMain: () => void
  onMore: () => void
}

function mainIcon(progression: CardProgression): IconName {
  if (progression.kind === 'ready') return 'up'
  return progression.kind === 'max' ? 'crown' : 'lock'
}

export function CardProgressBar({
  progression,
  isBusy,
  mainRef,
  moreRef,
  onMain,
  onMore,
}: CardProgressBarProps) {
  const tone = nextTierTone(progression.kind === 'max' ? null : progression.to)
  const isReady = progression.kind === 'ready'
  const isDisabled =
    isBusy ||
    progression.kind === 'loading' ||
    (progression.kind === 'max' && progression.stackCount === 0)

  return (
    <section className="vbar" aria-label="Progression de la carte">
      {progression.kind === 'max' ? (
        <MaxedBox stackCount={progression.stackCount} convertAllDust={progression.convertAllDust} />
      ) : (
        <BarGauges progression={progression} />
      )}
      <div className="vbar-r">
        <button
          type="button"
          ref={mainRef}
          className={isReady ? `vbar-main vitrine-go ${tone.className}` : 'vbar-main is-wait'}
          style={isReady ? tone.style : undefined}
          disabled={isDisabled}
          aria-haspopup={isDisabled ? undefined : 'dialog'}
          onClick={onMain}
        >
          <Icon name={mainIcon(progression)} className="size-[18px] flex-none" />
          <span className="truncate">{progressionButtonLabel(progression)}</span>
        </button>
        <button
          type="button"
          ref={moreRef}
          className="icon-btn flex-none"
          aria-label="Plus d'actions"
          aria-haspopup="dialog"
          onClick={onMore}
        >
          <Icon name="more" className="size-5" />
        </button>
      </div>
    </section>
  )
}
