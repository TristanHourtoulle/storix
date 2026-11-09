export const CAMERA_COPY = {
  primingTitle: 'Cadre tes cartes ici',
  primingBody: "Storix a besoin de l'appareil photo pour afficher le viseur.",
  primingAction: "Activer l'appareil photo",
  startingLabel: "Ouverture de l'appareil photo…",
  deniedTitle: 'Appareil photo bloqué',
  deniedBodyIos:
    'Ouvre Réglages › Apps › Safari › Appareil photo (Réglages › Safari sur iOS 17), choisis « Demander », puis rouvre Storix.',
  deniedBodyOther:
    "Autorise l'appareil photo pour ce site dans les réglages du navigateur, puis réessaie.",
  busyTitle: 'Appareil photo occupé',
  busyBody: 'Une autre app l’utilise. Ferme-la, puis réessaie.',
  fallbackLine: "En attendant, le déclencheur ouvre l'appareil photo du téléphone.",
  unavailableBody: "Le déclencheur ouvre l'appareil photo du téléphone.",
  pausedTitle: 'Appareil photo en pause',
  resume: 'Reprendre',
  retry: 'Réessayer',
  flip: 'Retourner',
  flipLabel: 'Retourner la caméra',
} as const

/** "1,8×" with a French decimal comma. */
export function zoomLabel(value: number): string {
  return `${value.toFixed(1).replace('.', ',')}×`
}
