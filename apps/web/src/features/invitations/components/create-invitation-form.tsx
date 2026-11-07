import { useState, type FormEvent } from 'react'
import { INVITATION_EXPIRY_DAYS, INVITATION_MAX_USES_LIMIT } from '@storix/shared'
import type { CreateInvitationBody } from '@storix/shared'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Notice } from '@/components/ui/notice'

interface CreateInvitationFormProps {
  onCreate: (body: CreateInvitationBody) => void
  isPending: boolean
  errorMessage: string | null
}

type ExpiryDays = CreateInvitationBody['expiresInDays']

const EXPIRY_LABELS: Record<ExpiryDays, string> = {
  1: '1 jour',
  7: '7 jours',
  30: '30 jours',
}

export function CreateInvitationForm({
  onCreate,
  isPending,
  errorMessage,
}: CreateInvitationFormProps) {
  const [expiresInDays, setExpiresInDays] = useState<ExpiryDays>(7)
  const [maxUsesInput, setMaxUsesInput] = useState('10')
  const [fieldError, setFieldError] = useState<string | undefined>()

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    const maxUses = Number(maxUsesInput)
    if (!Number.isInteger(maxUses) || maxUses < 1 || maxUses > INVITATION_MAX_USES_LIMIT) {
      setFieldError(`Entre 1 et ${INVITATION_MAX_USES_LIMIT}.`)
      return
    }
    setFieldError(undefined)
    onCreate({ expiresInDays, maxUses })
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <fieldset className="m-0 flex min-w-0 flex-col gap-1.5 border-0 p-0">
        <legend className="mb-1.5 p-0 text-xs uppercase tracking-[0.06em] text-muted">
          Validité
        </legend>
        <div className="flex flex-wrap gap-2">
          {INVITATION_EXPIRY_DAYS.map((days) => {
            const isOn = days === expiresInDays
            return (
              <button
                key={days}
                type="button"
                aria-pressed={isOn}
                onClick={() => setExpiresInDays(days)}
                className={`h-11 cursor-pointer rounded-full border-0 px-4 font-sans text-sm font-medium shadow-hairline ${isOn ? 'bg-ink text-bg' : 'bg-surface text-ink-2'}`}
              >
                {EXPIRY_LABELS[days]}
              </button>
            )
          })}
        </div>
      </fieldset>
      <Field label="Utilisations max" error={fieldError}>
        <Input
          type="number"
          inputMode="numeric"
          min={1}
          max={INVITATION_MAX_USES_LIMIT}
          required
          value={maxUsesInput}
          onChange={(event) => setMaxUsesInput(event.target.value)}
        />
      </Field>
      {errorMessage ? <Notice tone="error">{errorMessage}</Notice> : null}
      <Button type="submit" variant="primary" block isLoading={isPending}>
        Créer un lien
      </Button>
    </form>
  )
}
