import { describe, expect, it } from 'vitest'
import { storageDeletePayloadSchema } from './jobs'

const U = '3f2b8c1e-4a5d-4e6f-8a9b-0c1d2e3f4a5b'

describe('portrait storage keys in job payloads', () => {
  it('storage.delete payload accepts pic keys and rejects traversal', () => {
    expect(
      storageDeletePayloadSchema.safeParse({ keys: [`pic/avatar/u1/${U}/512.webp`] }).success,
    ).toBe(true)
    expect(storageDeletePayloadSchema.safeParse({ keys: ['pic/../img/x'] }).success).toBe(false)
  })
})
