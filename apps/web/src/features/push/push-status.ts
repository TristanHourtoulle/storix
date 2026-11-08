export type PushStatus =
  'unsupported' | 'needs-install' | 'unavailable' | 'denied' | 'disabled' | 'enabled'

const SUMMARIES: Record<PushStatus, string> = {
  enabled: 'Activées',
  disabled: 'Désactivées',
  denied: 'Bloquées',
  unavailable: 'Indisponibles',
  unsupported: 'Non prises en charge',
  'needs-install': 'À installer',
}

/** Short value shown on the profile row for a push status. */
export function pushStatusSummary(status: PushStatus): string {
  return SUMMARIES[status]
}
