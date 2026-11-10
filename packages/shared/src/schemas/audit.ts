import { z } from 'zod'
import { AUDIT_ACTIONS, AUDIT_CATEGORIES } from '../domain'
import { isoDateSchema } from './common'

export const AUDIT_PAGE_SIZE = 50

const AUDIT_CURSOR_PATTERN =
  /^(\d{1,15})\.([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/

export interface AuditCursor {
  createdAtMs: number
  id: string
}

/** Encodes an audit entry's position as an opaque Journal cursor. */
export function encodeAuditCursor(cursor: AuditCursor): string {
  return `${cursor.createdAtMs}.${cursor.id}`
}

/** Parses a Journal cursor, or returns null when it is malformed. */
export function parseAuditCursor(raw: string): AuditCursor | null {
  const match = AUDIT_CURSOR_PATTERN.exec(raw)
  if (match === null) return null
  const [, ms = '', id = ''] = match
  return { createdAtMs: Number(ms), id }
}

export const auditCursorSchema = z.string().transform((raw, ctx) => {
  const cursor = parseAuditCursor(raw)
  if (cursor === null) {
    ctx.issues.push({ code: 'custom', message: 'Invalid audit cursor', input: raw })
    return z.NEVER
  }
  return cursor
})

export const auditActionSchema = z.enum(AUDIT_ACTIONS)
export const auditCategorySchema = z.enum(AUDIT_CATEGORIES)

const auditCategoryListSchema = z
  .string()
  .transform((raw) => raw.split(',').filter((part) => part.length > 0))
  .pipe(z.array(auditCategorySchema).min(1))

export const auditQuerySchema = z.object({
  category: auditCategoryListSchema.optional(),
  actorId: z.string().min(1).optional(),
  from: isoDateSchema.optional(),
  cursor: auditCursorSchema.optional(),
})

export const auditPersonSchema = z.object({
  userId: z.string().nullable(),
  displayUsername: z.string().nullable(),
  isFormer: z.boolean(),
})

export const auditEntrySchema = z.object({
  id: z.uuid(),
  action: auditActionSchema,
  category: auditCategorySchema,
  actor: auditPersonSchema.nullable(),
  target: auditPersonSchema.nullable(),
  metadata: z.record(z.string(), z.unknown()),
  createdAt: isoDateSchema,
  count: z.int().min(1),
  times: z.array(isoDateSchema).min(1),
})

export const auditPageSchema = z.object({
  entries: z.array(auditEntrySchema),
  nextCursor: z.string().nullable(),
  hasUnseenAlerts: z.boolean(),
})

export type AuditQuery = z.infer<typeof auditQuerySchema>
export type AuditPerson = z.infer<typeof auditPersonSchema>
export type AuditEntry = z.infer<typeof auditEntrySchema>
export type AuditPage = z.infer<typeof auditPageSchema>
