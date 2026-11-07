import type { InputHTMLAttributes } from 'react'

export function Input({ className = '', ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...rest}
      className={`box-border h-11 w-full rounded-input border-0 bg-surface px-3 font-sans text-[15px] font-medium text-ink shadow-hairline-strong placeholder:text-faint focus-visible:outline-2 focus-visible:outline-accent ${className}`}
    />
  )
}
