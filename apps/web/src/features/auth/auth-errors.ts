const AUTH_MESSAGES: Record<string, string> = {
  INVALID_USERNAME_OR_PASSWORD: 'Pseudo ou mot de passe incorrect.',
  INVALID_PASSWORD: 'Mot de passe actuel incorrect.',
  PASSWORD_TOO_SHORT: 'Le mot de passe doit faire au moins 10 caractères.',
  PASSWORD_TOO_LONG: 'Le mot de passe est trop long.',
  ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED: 'Cet appareil a déjà une passkey enregistrée.',
  ERROR_CEREMONY_ABORTED: 'Ajout annulé. Tu peux réessayer quand tu veux.',
  AUTH_CANCELLED: 'Ajout annulé. Tu peux réessayer quand tu veux.',
}

interface AuthErrorShape {
  code?: string | undefined
  status?: number | undefined
}

/** Maps a Better Auth client error to a French user-facing message. */
export function authErrorMessage(error: AuthErrorShape, fallback: string): string {
  if (error.code && AUTH_MESSAGES[error.code]) return AUTH_MESSAGES[error.code] as string
  if (error.status === 429) return 'Trop de tentatives, réessaie dans quelques minutes.'
  if (error.status === 401) return 'Ta session a expiré, reconnecte-toi.'
  return fallback
}
