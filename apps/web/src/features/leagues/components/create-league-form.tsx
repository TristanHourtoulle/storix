import { useState, type FormEvent } from 'react'
import { leagueNameSchema } from '@storix/shared'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Notice } from '@/components/ui/notice'
import { useCreateLeague } from '../use-create-league'

export function CreateLeagueForm() {
  const { create, isPending, errorMessage } = useCreateLeague()
  const [name, setName] = useState('')
  const [fieldError, setFieldError] = useState<string | undefined>()

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    const parsed = leagueNameSchema.safeParse(name)
    if (!parsed.success) {
      setFieldError('Entre 2 et 40 caractères.')
      return
    }
    setFieldError(undefined)
    create({ name: parsed.data })
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <Field label="Nom de la ligue" error={fieldError}>
        <Input
          type="text"
          autoComplete="off"
          maxLength={40}
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </Field>
      {errorMessage ? <Notice tone="error">{errorMessage}</Notice> : null}
      <Button type="submit" variant="primary" block isLoading={isPending}>
        Créer la ligue
      </Button>
    </form>
  )
}
