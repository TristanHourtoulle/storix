import type { ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant: 'primary' | 'ghost'
  block?: boolean
  isLoading?: boolean
}

const VARIANTS = {
  primary: 'bg-ink text-bg',
  ghost: 'bg-transparent text-ink shadow-hairline-strong',
} as const

export function Button({
  variant,
  block = false,
  isLoading = false,
  disabled,
  type = 'button',
  className = '',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      type={type}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      className={`inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-control border-0 px-5 font-display text-base font-semibold no-underline disabled:cursor-not-allowed disabled:opacity-60 ${VARIANTS[variant]} ${block ? 'w-full' : ''} ${className}`}
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
