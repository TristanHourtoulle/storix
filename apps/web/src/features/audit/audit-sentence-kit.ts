import { CARD_TIERS, type CardTier } from '@storix/shared'

export type SentencePart = string | { strong: string; tier?: CardTier; isWarning?: boolean }

export interface AuditSentence {
  parts: SentencePart[]
  details: string[]
  isWarning: boolean
}

export type Metadata = Record<string, unknown>

export function rec(meta: Metadata, key: string): Metadata | null {
  const value = meta[key]
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Metadata)
    : null
}

export function str(meta: Metadata | null, key: string): string | null {
  const value = meta?.[key]
  return typeof value === 'string' ? value : null
}

export function num(meta: Metadata | null, key: string): number | null {
  const value = meta?.[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

export function tierOf(value: string | null): CardTier | null {
  return CARD_TIERS.find((tier) => tier === value) ?? null
}

export function sentence(parts: SentencePart[], details: string[] = []): AuditSentence {
  return { parts, details, isWarning: false }
}
