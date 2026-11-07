import type { ReactNode } from 'react'

interface FieldProps {
  label: string
  error?: string
  hint?: string
  children: ReactNode
}

export function Field({ label, error, hint, children }: FieldProps) {
  return (
    <label className="flex min-w-0 flex-1 flex-col gap-1.5">
      <span className="text-xs uppercase tracking-[0.06em] text-muted">{label}</span>
      {children}
      {error ? (
        <span role="alert" className="text-[13px] text-danger">
          {error}
        </span>
      ) : hint ? (
        <span className="text-[13px] text-faint">{hint}</span>
      ) : null}
    </label>
  )
}
