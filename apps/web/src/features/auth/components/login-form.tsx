import { useState, type FormEvent } from 'react'
import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Notice } from '@/components/ui/notice'
import { usernameFieldError } from '../field-errors'
import { useLogin } from '../use-login'

interface LoginFormProps {
  redirectTo?: string
  isResetDone: boolean
  isSignupFailed?: boolean
}

export function LoginForm({ redirectTo, isResetDone, isSignupFailed = false }: LoginFormProps) {
  const { loginWithPassword, loginWithPasskey, isPending, error } = useLogin(redirectTo)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [usernameError, setUsernameError] = useState<string | undefined>()
  const [passwordError, setPasswordError] = useState<string | undefined>()

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    const nextUsernameError = usernameFieldError(username)
    const nextPasswordError = password ? undefined : 'Entre ton mot de passe.'
    setUsernameError(nextUsernameError)
    setPasswordError(nextPasswordError)
    if (nextUsernameError || nextPasswordError) return
    await loginWithPassword({ username: username.trim(), password })
  }

  return (
    <div className="flex flex-col gap-4">
      {isSignupFailed ? (
        <Notice tone="error">Compte créé, mais connexion impossible. Connecte-toi.</Notice>
      ) : null}
      {isResetDone ? (
        <Notice tone="info">Mot de passe modifié. Connecte-toi avec le nouveau.</Notice>
      ) : null}
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <Field label="Pseudo" error={usernameError}>
          <Input
            type="text"
            name="username"
            autoComplete="username webauthn"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            required
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          />
        </Field>
        <Field label="Mot de passe" error={passwordError}>
          <Input
            type="password"
            name="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </Field>
        {error ? <Notice tone="error">{error}</Notice> : null}
        <Button type="submit" variant="primary" block isLoading={isPending}>
          Se connecter
        </Button>
      </form>
      <Button variant="ghost" block disabled={isPending} onClick={() => loginWithPasskey()}>
        Utiliser une passkey
      </Button>
      <Link to="/reset" className="text-center text-sm text-accent-hover">
        J'ai un code de réinitialisation
      </Link>
      <p className="m-0 text-center text-[13px] leading-snug text-faint">
        Pas de compte ? Demande un lien d'invitation à un membre.
      </p>
    </div>
  )
}
