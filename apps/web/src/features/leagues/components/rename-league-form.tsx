import { useState, type FormEvent } from 'react'
import { leagueNameSchema } from '@storix/shared'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Notice } from '@/components/ui/notice'
import { useRenameLeague } from '../use-rename-league'

interface RenameLeagueFormProps {
  leagueId: string
  currentName: string
}

const NAME_ERROR = '2 à 40 caractères.'

export function RenameLeagueForm({ leagueId, currentName }: RenameLeagueFormProps) {
  const { rename, reset, isPending, isSuccess, errorMessage } = useRenameLeague(leagueId)
  const [draft, setDraft] = useState(currentName)
  const isValid = leagueNameSchema.safeParse(draft).success
  const isUnchanged = draft.trim() === currentName

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    if (isValid && !isUnchanged) rename({ name: draft.trim() })
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3">
      <Field label="Nom de la ligue" error={draft.length > 0 && !isValid ? NAME_ERROR : undefined}>
        <Input
          type="text"
          autoComplete="off"
          maxLength={60}
          value={draft}
          disabled={isPending}
          onChange={(event) => {
            reset()
            setDraft(event.target.value)
          }}
        />
      </Field>
      {errorMessage ? <Notice tone="error">{errorMessage}</Notice> : null}
      {isSuccess && isUnchanged ? <Notice tone="info">Ligue renommée.</Notice> : null}
      <Button
        type="submit"
        variant="primary"
        block
        isLoading={isPending}
        disabled={!isValid || isUnchanged}
      >
        Renommer
      </Button>
    </form>
  )
}
