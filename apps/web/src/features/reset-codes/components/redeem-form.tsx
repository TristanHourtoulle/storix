import { useState, type FormEvent } from 'react'
import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Notice } from '@/components/ui/notice'
import { passwordFieldError, usernameFieldError } from '@/features/auth/field-errors'
import { useRedeemResetCode } from '../use-redeem-reset-code'

export function RedeemForm() {
  const { redeem, isPending, errorMessage } = useRedeemResetCode()
  const [username, setUsername] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [usernameError, setUsernameError] = useState<string | undefined>()
  const [codeError, setCodeError] = useState<string | undefined>()
  const [passwordError, setPasswordError] = useState<string | undefined>()

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    const trimmedCode = code.trim()
    const nextUsernameError = usernameFieldError(username)
    const nextCodeError = trimmedCode ? undefined : 'Entre le code reçu.'
    const nextPasswordError = passwordFieldError(newPassword)
    setUsernameError(nextUsernameError)
    setCodeError(nextCodeError)
    setPasswordError(nextPasswordError)
    if (nextUsernameError || nextCodeError || nextPasswordError) return
    redeem({ username: username.trim(), code: trimmedCode, newPassword })
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <Field label="Pseudo" error={usernameError}>
        <Input
          type="text"
          name="username"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          required
          value={username}
          onChange={(event) => setUsername(event.target.value)}
        />
      </Field>
      <Field label="Code" error={codeError}>
        <Input
          type="text"
          name="code"
          placeholder="XXXXX-XXXXX"
          autoComplete="off"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          required
          value={code}
          onChange={(event) => setCode(event.target.value)}
        />
      </Field>
      <Field label="Nouveau mot de passe" error={passwordError} hint="10 caractères minimum">
        <Input
          type="password"
          name="new-password"
          autoComplete="new-password"
          required
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
        />
      </Field>
      {errorMessage ? <Notice tone="error">{errorMessage}</Notice> : null}
      <Button type="submit" variant="primary" block isLoading={isPending}>
        Valider
      </Button>
      <Link to="/login" className="text-center text-sm text-accent-hover">
        Retour à la connexion
      </Link>
    </form>
  )
}
