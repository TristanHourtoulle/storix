import { useState, type FormEvent } from 'react'
import { Link } from '@tanstack/react-router'
import { buttonClassName, Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Notice } from '@/components/ui/notice'
import { passwordFieldError, usernameFieldError } from '@/features/auth/field-errors'
import { useSignup } from '../use-signup'

interface SignupFormProps {
  token: string
}

export function SignupForm({ token }: SignupFormProps) {
  const { signup, isPending, errorMessage } = useSignup(token)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [usernameError, setUsernameError] = useState<string | undefined>()
  const [passwordError, setPasswordError] = useState<string | undefined>()

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    const nextUsernameError = usernameFieldError(username)
    const nextPasswordError = passwordFieldError(password)
    setUsernameError(nextUsernameError)
    setPasswordError(nextPasswordError)
    if (nextUsernameError || nextPasswordError) return
    await signup({ username: username.trim(), password })
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <Field label="Pseudo" error={usernameError}>
          <Input
            type="text"
            name="username"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            maxLength={24}
            required
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          />
        </Field>
        <Field label="Mot de passe" error={passwordError} hint="10 caractères minimum">
          <Input
            type="password"
            name="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </Field>
        {errorMessage ? <Notice tone="error">{errorMessage}</Notice> : null}
        <Button type="submit" variant="primary" block isLoading={isPending}>
          Créer mon compte
        </Button>
      </form>
      <Link
        to="/login"
        search={{ redirect: `/join/${token}` }}
        className={buttonClassName({ variant: 'ghost', block: true })}
      >
        J'ai déjà un compte
      </Link>
    </div>
  )
}
