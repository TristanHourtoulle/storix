import { useState, type FormEvent } from 'react'
import { passwordSchema } from '@storix/shared'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Notice } from '@/components/ui/notice'
import { useChangePassword } from '../use-change-password'

export function ChangePasswordForm() {
  const { changePassword, isPending } = useChangePassword()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [fieldError, setFieldError] = useState<string | undefined>()
  const [error, setError] = useState<string | null>(null)
  const [isDone, setIsDone] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setError(null)
    setIsDone(false)
    if (!passwordSchema.safeParse(newPassword).success) {
      setFieldError('10 à 128 caractères.')
      return
    }
    setFieldError(undefined)
    try {
      await changePassword({ currentPassword, newPassword })
      setCurrentPassword('')
      setNewPassword('')
      setIsDone(true)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Une erreur est survenue.')
    }
  }

  return (
    <section aria-labelledby="password-title" className="flex flex-col gap-3">
      <h2 id="password-title">Mot de passe</h2>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3">
        <Field label="Mot de passe actuel">
          <Input
            type="password"
            autoComplete="current-password"
            required
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
          />
        </Field>
        <Field label="Nouveau mot de passe" error={fieldError}>
          <Input
            type="password"
            autoComplete="new-password"
            required
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
          />
        </Field>
        {error ? <Notice tone="error">{error}</Notice> : null}
        {isDone ? (
          <Notice tone="info">
            Mot de passe modifié. Tes autres sessions ont été déconnectées.
          </Notice>
        ) : null}
        <Button type="submit" variant="primary" block isLoading={isPending}>
          Modifier
        </Button>
      </form>
    </section>
  )
}
