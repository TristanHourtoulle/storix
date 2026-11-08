import type { ButtonHTMLAttributes, MouseEvent } from 'react'
import { emitUiSound, type UiSound } from '@/lib/ui-sound'

type ButtonVariant = 'primary' | 'ghost' | 'danger'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant: ButtonVariant
  block?: boolean
  isLoading?: boolean
  /** Feedback sound on press; defaults to `tap` for primary and `destructive` for danger. */
  sound?: UiSound | 'none'
}

const DEFAULT_SOUND: Record<ButtonVariant, UiSound | 'none'> = {
  primary: 'tap',
  ghost: 'none',
  danger: 'destructive',
}

const VARIANTS = {
  primary: 'bg-ink text-bg',
  ghost: 'bg-transparent text-ink shadow-hairline-strong',
  danger: 'bg-danger text-bg',
} as const

interface ButtonClassOptions {
  variant: ButtonVariant
  block?: boolean
}

/** Class names shared by buttons and link-styled buttons. */
export function buttonClassName({ variant, block = false }: ButtonClassOptions): string {
  return `inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-control border-0 px-5 font-display text-base font-semibold no-underline disabled:cursor-not-allowed disabled:opacity-60 ${VARIANTS[variant]} ${block ? 'w-full' : ''}`
}

export function Button({
  variant,
  block = false,
  isLoading = false,
  disabled,
  type = 'button',
  className = '',
  children,
  onClick,
  sound = DEFAULT_SOUND[variant],
  ...rest
}: ButtonProps) {
  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    if (sound !== 'none') emitUiSound(sound)
    onClick?.(event)
  }

  return (
    <button
      {...rest}
      onClick={handleClick}
      type={type}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      className={`${buttonClassName({ variant, block })} ${className}`}
    >
      {isLoading ? (
        <span
          aria-hidden="true"
          className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      ) : null}
      {children}
    </button>
  )
}
