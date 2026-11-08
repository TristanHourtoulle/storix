import type { EditUploadBody } from '@storix/shared'
import { imageSetPrefixes } from '../use-drafts'
import type { DraftCapacity } from '../use-photo-drafts'
import { isBlankTitle, type StackCard } from './session-reducer'

export type EditPatch = Partial<Pick<StackCard, 'title' | 'taggedUserIds' | 'crop'>>

let cardSequence = 0

/** Returns a unique id for a card picked on this device. */
export function nextLocalId(): string {
  cardSequence += 1
  return `card-${Date.now().toString(36)}-${cardSequence}`
}

/** Converts local field edits to a PATCH body, keeping only the given fields. */
export function toBody(patch: EditPatch): EditUploadBody {
  return {
    ...(patch.title !== undefined ? { title: patch.title } : {}),
    ...(patch.taggedUserIds !== undefined ? { taggedUserIds: [...patch.taggedUserIds] } : {}),
    ...(patch.crop !== undefined ? { crop: patch.crop } : {}),
  }
}

/** Returns the non-empty local fields of a card to send right after its completion, or null. */
export function filledFields(card: StackCard): EditUploadBody | null {
  const body = toBody({
    ...(isBlankTitle(card) ? {} : { title: card.title }),
    ...(card.taggedUserIds.length > 0 ? { taggedUserIds: card.taggedUserIds } : {}),
    ...(card.crop !== null ? { crop: card.crop } : {}),
  })
  return Object.keys(body).length > 0 ? body : null
}

/** Counts the cards that take a slot of the capacity: every card for a batch, unreserved ones for the daily quota. */
export function slotsUsed(cards: readonly StackCard[], capacity: DraftCapacity): number {
  if (capacity.kind === 'batch') return cards.length
  return cards.filter(
    (card) => card.uploadId === null && card.phase !== 'error' && card.phase !== 'duplicate',
  ).length
}

/** Returns the storage prefixes of the server images shown by the given cards. */
export function remoteMediaPrefixes(cards: readonly StackCard[]): string[] {
  return imageSetPrefixes(cards.flatMap((card) => (card.remote ? [card.remote.image] : [])))
}
