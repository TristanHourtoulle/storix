import { cloneElement, useId, type ReactElement } from 'react'

interface FieldControlProps {
  id?: string
  'aria-invalid'?: boolean
  'aria-describedby'?: string
}

interface FieldProps {
  label: string
  error?: string
  hint?: string
  children: ReactElement<FieldControlProps>
}

export function Field({ label, error, hint, children }: FieldProps) {
  const id = useId()
  const messageId = `${id}-message`
  const message = error ?? hint
  const control = cloneElement(children, {
    id,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': message ? messageId : undefined,
  })

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
      <label htmlFor={id} className="text-xs uppercase tracking-[0.06em] text-muted">
        {label}
      </label>
      {control}
      {error ? (
        <span id={messageId} role="alert" className="text-[13px] text-danger">
          {error}
        </span>
      ) : hint ? (
        <span id={messageId} className="text-[13px] text-faint">
          {hint}
        </span>
      ) : null}
    </div>
  )
}
