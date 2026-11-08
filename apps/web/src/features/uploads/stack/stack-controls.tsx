import type { ReactNode } from 'react'
import { Icon } from '@/components/ui/icon'

interface StackControlsProps {
  canPrev: boolean
  isLast: boolean
  onPrev: () => void
  onRemove: () => void
  onNext: () => void
}

interface RoundButtonProps {
  label: string
  tone: 'plain' | 'danger' | 'primary'
  isDisabled?: boolean
  onClick: () => void
  children: ReactNode
}

const TONES = {
  plain: 'size-[54px] bg-surface text-ink shadow-hairline-strong',
  danger: 'size-[54px] bg-surface text-danger shadow-hairline-strong',
  primary: 'size-16 bg-ink text-bg',
} as const

function RoundButton({ label, tone, isDisabled = false, onClick, children }: RoundButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={isDisabled}
      onClick={onClick}
      className={`grid cursor-pointer appearance-none place-items-center rounded-full border-0 p-0 disabled:cursor-not-allowed disabled:opacity-40 ${TONES[tone]}`}
    >
      {children}
    </button>
  )
}

/** Précédent · Retirer · Suivant, with the swipe hint (R3). */
export function StackControls({ canPrev, isLast, onPrev, onRemove, onNext }: StackControlsProps) {
  return (
    <div className="flex flex-col items-center gap-2.5">
      <div className="flex items-center justify-center gap-[22px]">
        <RoundButton label="Carte précédente" tone="plain" isDisabled={!canPrev} onClick={onPrev}>
          <Icon name="arrow-left" />
        </RoundButton>
        <RoundButton label="Retirer la photo" tone="danger" onClick={onRemove}>
          <Icon name="close" />
        </RoundButton>
        <RoundButton
          label={isLast ? 'Voir le récapitulatif' : 'Carte suivante'}
          tone="primary"
          onClick={onNext}
        >
          <Icon name="arrow-right" className="size-[26px]" />
        </RoundButton>
      </div>
      <p className="m-0 text-center text-[11px] text-faint">
        Glisse à droite pour la suivante, à gauche pour revenir
      </p>
    </div>
  )
}
