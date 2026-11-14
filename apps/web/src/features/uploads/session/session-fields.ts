import type { EditUploadBody } from '@storix/shared'
import { imageSetPrefixes } from '../use-drafts'
import type { DraftCapacity } from '../draft-capacity'
import type { CropRect } from '@storix/shared/domain'
import type { StackCard } from './session-reducer'

export type EditPatch = Partial<Pick<StackCard, 'title' | 'taggedUserIds' | 'seriesIds' | 'crop'>>

let cardSequence = 0

/** Returns a unique id for a card picked on this device. */
export function nextLocalId(): string {
  cardSequence += 1
  return `card-${Date.now().toString(36)}-${cardSequence}`
}

export interface DraftFields {
  title: string
  taggedUserIds: readonly string[]
  seriesIds: readonly string[]
  crop: CropRect | null
}

/** The fields of a draft as the server stores them before any edit. */
export const EMPTY_DRAFT_FIELDS: DraftFields = {
  title: '',
  taggedUserIds: [],
  seriesIds: [],
  crop: null,
}

/** Returns the editable fields of a card. */
export function fieldsOf(card: StackCard): DraftFields {
  return {
    title: card.title,
    taggedUserIds: card.taggedUserIds,
    seriesIds: card.seriesIds,
    crop: card.crop,
  }
}

function sameTags(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((id, index) => id === b[index])
}

function sameCrop(a: CropRect | null, b: CropRect | null): boolean {
  if (a === null || b === null) return a === b
  return a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h && a.rotate === b.rotate
}

/** Returns the PATCH body of the fields that differ from what the server last received, or null. */
export function changedFields(sent: DraftFields, current: DraftFields): EditUploadBody | null {
  const body: EditUploadBody = {
    ...(sent.title.trim() !== current.title.trim() ? { title: current.title } : {}),
    ...(sameTags(sent.taggedUserIds, current.taggedUserIds)
      ? {}
      : { taggedUserIds: [...current.taggedUserIds] }),
    ...(sameTags(sent.seriesIds, current.seriesIds) ? {} : { seriesIds: [...current.seriesIds] }),
    ...(sameCrop(sent.crop, current.crop) ? {} : { crop: current.crop }),
  }
  return Object.keys(body).length > 0 ? body : null
}

/** Counts the cards that take a slot of the capacity: every card when unlimited, unreserved ones for the daily quota. */
export function slotsUsed(cards: readonly StackCard[], capacity: DraftCapacity): number {
  if (capacity.kind === 'unlimited') return cards.length
  return cards.filter(
    (card) => card.uploadId === null && card.phase !== 'error' && card.phase !== 'duplicate',
  ).length
}

/** Returns the storage prefixes of the server images shown by the given cards. */
export function remoteMediaPrefixes(cards: readonly StackCard[]): string[] {
  return imageSetPrefixes(cards.flatMap((card) => (card.remote ? [card.remote.image] : [])))
}
