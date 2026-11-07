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
  UPLOAD_QUOTA_EXCEEDED: "Tu as atteint ta limite de 10 photos aujourd'hui.",
  UPLOAD_NOT_READY: "La photo n'est pas encore arrivée, réessaie.",
  UPLOAD_EXPIRED: "Ce lien d'envoi a expiré, recommence l'ajout de cette photo.",
  BOOSTER_STOCK_EMPTY: 'Plus de booster en stock, reviens un peu plus tard.',
  BOOSTER_POOL_EMPTY: 'Pas encore assez de cartes dans la ligue pour un booster.',
  INSUFFICIENT_DUST: 'Il te manque des paillettes.',
  COPY_NOT_OWNED: "Tu n'as plus cet exemplaire.",
  CRAFT_NOT_ALLOWED: 'Cette carte ne peut pas être fabriquée.',
  FOIL_NOT_ALLOWED: 'Cet exemplaire ne peut pas passer en foil.',
  REACTION_NOT_ALLOWED: 'Tu ne peux pas réagir à cette carte.',
  MYTHIC_CAP_REACHED: 'La ligue a déjà 3 Mythiques.',
  INVALID_TIER_BOUNDS: 'Le minimum doit être inférieur ou égal au maximum.',
  CAPTURE_DATE_MISSING: "Cette photo n'a pas de date de prise de vue.",
  WITHDRAW_NOT_ALLOWED: 'Tu ne peux retirer que les photos où tu apparais.',
  OWNERSHIP_TRANSFER_REQUIRED: "Transfère d'abord la propriété de tes ligues.",
  LEAVE_NOT_ALLOWED: 'Le propriétaire doit transférer la ligue avant de la quitter.',
  REAUTH_REQUIRED: 'Confirme ton identité pour continuer.',
  CONFIRMATION_MISMATCH: "Le nom d'utilisateur ne correspond pas.",
  BOOSTER_CONTENT_REMOVED: 'Une carte de ce booster a été retirée de la ligue.',
  INTERNAL_ERROR: 'Une erreur est survenue.',
}

/** Maps an API error code to its French user-facing message. */
export function errorMessage(code: ErrorCode): string {
  return MESSAGES[code]
}
