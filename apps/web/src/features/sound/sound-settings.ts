import { useSyncExternalStore } from 'react'
import { z } from 'zod'
import { STORAGE_KEYS, readStorage, writeStorage } from '@/lib/storage'
import type { SoundCategory } from './sound-types'

export interface SoundSettings {
  isBoosterEnabled: boolean
  isInterfaceEnabled: boolean
  volume: number
}

export const DEFAULT_SOUND_SETTINGS: SoundSettings = {
  isBoosterEnabled: true,
  isInterfaceEnabled: false,
  volume: 70,
}

const settingsSchema = z.object({
  isBoosterEnabled: z.boolean().catch(DEFAULT_SOUND_SETTINGS.isBoosterEnabled),
  isInterfaceEnabled: z.boolean().catch(DEFAULT_SOUND_SETTINGS.isInterfaceEnabled),
  volume: z.number().int().min(0).max(100).catch(DEFAULT_SOUND_SETTINGS.volume),
})

function parseJson(raw: string): unknown {
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

/** Parses stored sound settings, falling back to the defaults field by field. */
export function parseSoundSettings(raw: string | null): SoundSettings {
  if (raw === null) return DEFAULT_SOUND_SETTINGS
  const parsed = settingsSchema.safeParse(parseJson(raw))
  return parsed.success ? parsed.data : DEFAULT_SOUND_SETTINGS
}

let current: SoundSettings = parseSoundSettings(readStorage(STORAGE_KEYS.soundSettings))
let listeners: ReadonlySet<() => void> = new Set()

function subscribe(listener: () => void): () => void {
  listeners = new Set(listeners).add(listener)
  return () => {
    listeners = new Set([...listeners].filter((item) => item !== listener))
  }
}

/** Current sound settings of this device. */
export function getSoundSettings(): SoundSettings {
  return current
}

/** True when sounds of a category may play on this device. */
export function isCategoryEnabled(category: SoundCategory): boolean {
  return category === 'booster' ? current.isBoosterEnabled : current.isInterfaceEnabled
}

/** Merges a change into the device sound settings and persists them. */
export function updateSoundSettings(patch: Partial<SoundSettings>): void {
  current = { ...current, ...patch }
  writeStorage(STORAGE_KEYS.soundSettings, JSON.stringify(current))
  listeners.forEach((listener) => listener())
}

/** Subscribes to settings changes outside React. */
export function onSoundSettingsChange(listener: () => void): () => void {
  return subscribe(listener)
}

/** Sound settings of this device, re-rendering on change. */
export function useSoundSettings(): SoundSettings {
  return useSyncExternalStore(subscribe, getSoundSettings, getSoundSettings)
}
