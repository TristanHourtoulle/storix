import { useState, type FormEvent } from 'react'
import { DISPLAY_NAME_MAX_LENGTH, DISPLAY_NAME_MIN_LENGTH, displayNameSchema } from '@storix/shared'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Notice } from '@/components/ui/notice'
import { useUpdateDisplayName } from '../use-update-display-name'

interface DisplayNameSectionProps {
  displayName: string
  username: string
}

const NAME_ERROR = `${DISPLAY_NAME_MIN_LENGTH} à ${DISPLAY_NAME_MAX_LENGTH} caractères : lettres, chiffres, espaces, . _ -`

export function DisplayNameSection({ displayName, username }: DisplayNameSectionProps) {
  const { save, reset, isPending, isSuccess, errorMessage } = useUpdateDisplayName()
  const [draft, setDraft] = useState(displayName)
  const parsed = displayNameSchema.safeParse(draft)
  const isUnchanged = draft.trim() === displayName

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    if (parsed.success && !isUnchanged) save({ displayName: parsed.data })
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3">
      <Field
        label="Nouveau pseudo"
        error={draft.length > 0 && !parsed.success ? NAME_ERROR : undefined}
      >
        <Input
          type="text"
          autoComplete="off"
          value={draft}
          disabled={isPending}
          onChange={(event) => {
            reset()
            setDraft(event.target.value)
          }}
        />
      </Field>
      <p className="m-0 text-[13px] text-faint">
        Ton identifiant de connexion reste <strong>{username}</strong>.
      </p>
      {errorMessage ? <Notice tone="error">{errorMessage}</Notice> : null}
      {isSuccess && isUnchanged ? <Notice tone="info">Pseudo mis à jour.</Notice> : null}
      <Button
        type="submit"
        variant="primary"
        block
        isLoading={isPending}
        disabled={!parsed.success || isUnchanged}
      >
        Enregistrer
      </Button>
    </form>
  )
}
