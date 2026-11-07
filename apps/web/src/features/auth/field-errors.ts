import { passwordSchema, usernameSchema } from '@storix/shared'

/** Returns a French error for an invalid username, or undefined when valid. */
export function usernameFieldError(value: string): string | undefined {
  return usernameSchema.safeParse(value).success
    ? undefined
    : '3 à 24 caractères : lettres, chiffres, _ et .'
}

/** Returns a French error for an invalid new password, or undefined when valid. */
export function passwordFieldError(value: string): string | undefined {
  return passwordSchema.safeParse(value).success ? undefined : '10 à 128 caractères.'
}
