import { describe, expect, it } from 'vitest'
import { meResponseSchema } from './auth'
import { storageDeletePayloadSchema } from './jobs'
import { leagueDetailSchema, leagueSummarySchema } from './leagues'
import { memberSummarySchema } from './members'
import {
  avatarUploadParamsSchema,
  completePortraitUploadBodySchema,
  portraitSchema,
} from './portraits'
import { UPLOAD_KINDS, uploadStateSchema } from './uploads'

const U = '3f2b8c1e-4a5d-4e6f-8a9b-0c1d2e3f4a5b'
const L = '0b6f7c1e-3a59-4c1e-9d7e-2f1a6c3b4d5e'
const SIG = 'a'.repeat(64)
const portrait = {
  url: `/media/1/${SIG}/pic/x`,
  thumbUrl: `/media/1/${SIG}/pic/y`,
  dominantColor: '#a1b2c3',
}

describe('portrait storage keys in job payloads', () => {
  it('storage.delete payload accepts pic keys and rejects traversal', () => {
    expect(
      storageDeletePayloadSchema.safeParse({ keys: [`pic/avatar/u1/${U}/512.webp`] }).success,
    ).toBe(true)
    expect(storageDeletePayloadSchema.safeParse({ keys: ['pic/../img/x'] }).success).toBe(false)
  })
})

describe('portrait contracts', () => {
  it('portrait requires media urls and a hex color', () => {
    expect(portraitSchema.safeParse(portrait).success).toBe(true)
    expect(portraitSchema.safeParse({ ...portrait, url: 'https://evil.test/x' }).success).toBe(
      false,
    )
    expect(portraitSchema.safeParse({ ...portrait, thumbUrl: '/api/x' }).success).toBe(false)
    expect(portraitSchema.safeParse({ ...portrait, dominantColor: 'red' }).success).toBe(false)
    expect(portraitSchema.safeParse({ ...portrait, dominantColor: '#A1B2C3' }).success).toBe(false)
  })

  it('league summary requires a nullable photo', () => {
    const base = { id: L, name: 'QA', role: 'member', memberCount: 1 }
    expect(leagueSummarySchema.safeParse({ ...base, photo: null }).success).toBe(true)
    expect(leagueSummarySchema.safeParse({ ...base, photo: portrait }).success).toBe(true)
    expect(leagueSummarySchema.safeParse(base).success).toBe(false)
  })

  it('league detail requires a nullable photo', () => {
    const base = {
      id: L,
      name: 'QA',
      memberCount: 1,
      myRole: 'admin',
      permissions: { canManageInvitations: true, canManageMembers: true },
    }
    expect(leagueDetailSchema.safeParse({ ...base, photo: null }).success).toBe(true)
    expect(leagueDetailSchema.safeParse(base).success).toBe(false)
  })

  it('me and member summaries require a nullable avatar', () => {
    const me = {
      user: { id: 'u1', username: 'qa', displayUsername: 'QA' },
      homeLeagueId: null,
      leagues: [],
    }
    expect(meResponseSchema.safeParse({ ...me, avatar: portrait }).success).toBe(true)
    expect(meResponseSchema.safeParse(me).success).toBe(false)
    const member = {
      userId: 'u1',
      displayUsername: 'QA',
      username: 'qa',
      role: 'member',
      joinedAt: '2026-11-08T12:00:00.000Z',
      isSelf: true,
      canChangeRole: false,
      canRemove: false,
      canIssueResetCode: false,
      authoredCardCount: 0,
      canTransferOwnership: false,
    }
    expect(memberSummarySchema.safeParse({ ...member, avatar: null }).success).toBe(true)
    expect(memberSummarySchema.safeParse(member).success).toBe(false)
  })

  it('upload state accepts the NOT_ALLOWED rejection', () => {
    expect(
      uploadStateSchema.safeParse({
        uploadId: U,
        status: 'rejected',
        cardId: null,
        rejectionReason: 'NOT_ALLOWED',
      }).success,
    ).toBe(true)
  })

  it('lists the upload kinds and accepts an empty strict completion body only', () => {
    expect(UPLOAD_KINDS).toEqual(['card', 'avatar', 'league'])
    expect(completePortraitUploadBodySchema.safeParse({}).success).toBe(true)
    expect(completePortraitUploadBodySchema.safeParse({ title: 'x' }).success).toBe(false)
    expect(avatarUploadParamsSchema.safeParse({ uploadId: U }).success).toBe(true)
    expect(avatarUploadParamsSchema.safeParse({ uploadId: 'nope' }).success).toBe(false)
  })
})
