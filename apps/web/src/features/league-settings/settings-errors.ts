import { updateLeagueSettingsBodySchema, type UpdateLeagueSettingsBody } from '@storix/shared'

export type FieldErrors = Partial<Record<string, string>>

export const WEIGHTS_ERROR = 'Au moins un critère doit compter'

const MESSAGES: Record<string, string> = {
  'booster.intervalMinutes': 'Entre 1 et 10 080 minutes.',
  'booster.maxStock': 'Entre 1 et 20.',
  'booster.joinGift': 'Entre 0 et 20, sans dépasser le stock maximum.',
  uploadQuotaPerDay: 'Entre 1 et 50.',
  newCardDelayMinutes: 'Entre 0 et 10 080 minutes.',
  rarityWeights: WEIGHTS_ERROR,
}

function messageFor(path: string): string | undefined {
  const exact = MESSAGES[path]
  if (exact) return exact
  const root = path.split('.')[0]
  return root === 'rarityWeights' ? WEIGHTS_ERROR : undefined
}

function toFieldErrors(paths: readonly string[]): FieldErrors {
  const errors: Record<string, string> = {}
  for (const path of paths) {
    const message = messageFor(path)
    if (message && errors[path] === undefined) errors[path] = message
  }
  return errors
}

/** Validates the draft with the shared schema and returns French messages keyed by field path. */
export function validateSettings(draft: unknown): FieldErrors {
  const result = updateLeagueSettingsBodySchema.safeParse(draft)
  if (result.success) return {}
  return toFieldErrors(result.error.issues.map((issue) => issue.path.join('.')))
}

export function isValidSettings(draft: unknown): draft is UpdateLeagueSettingsBody {
  return updateLeagueSettingsBodySchema.safeParse(draft).success
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function issuePath(issue: unknown): string | null {
  if (!isRecord(issue)) return null
  if (Array.isArray(issue.path)) return issue.path.map(String).join('.')
  if (typeof issue.instancePath === 'string') {
    return issue.instancePath.split('/').filter(Boolean).join('.')
  }
  return null
}

/** Extracts French field errors from the details of a 400 API response. */
export function fieldErrorsFromDetails(details: Record<string, unknown> | undefined): FieldErrors {
  const issues = details?.issues
  if (!Array.isArray(issues)) return {}
  const paths = issues.map(issuePath).filter((path): path is string => path !== null)
  return toFieldErrors(paths)
}
