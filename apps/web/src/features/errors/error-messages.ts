import type { ErrorCode } from '@storix/shared'

const MESSAGES: Record<ErrorCode, string> = {
  VALIDATION_FAILED: 'Certains champs sont invalides.',
  UNAUTHENTICATED: 'Ta session a expiré, reconnecte-toi.',
  FORBIDDEN: "Tu n'as pas accès à cette action.",
  NOT_FOUND: 'Introuvable.',
  CSRF_ORIGIN_MISMATCH: 'Requête refusée, recharge la page.',
  RATE_LIMITED: 'Trop de tentatives, réessaie dans quelques minutes.',
  USERNAME_TAKEN: 'Ce pseudo est déjà pris.',
  INVITATION_INVALID: "Ce lien d'invitation n'est plus valide.",
  ALREADY_MEMBER: 'Tu fais déjà partie de cette ligue.',
  RESET_NOT_ALLOWED: 'Tu ne peux pas réinitialiser le mot de passe de ce membre.',
  INVALID_RESET_CODE: 'Code invalide ou expiré.',
  INTERNAL_ERROR: 'Une erreur est survenue.',
}

/** Maps an API error code to its French user-facing message. */
export function errorMessage(code: ErrorCode): string {
  return MESSAGES[code]
}
