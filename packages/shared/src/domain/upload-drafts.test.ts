import { describe, expect, it } from 'vitest'
import { CARD_CROP_FRAME } from './crop-frame'
import {
  canDiscardUpload,
  canEditDraft,
  classifyDraftForSweep,
  DISCARDED_SWEEP_DELAY_MS,
  DRAFT_TTL_MS,
  planPublish,
  PUBLISH_STUCK_MS,
} from './upload-drafts'

const NOW = new Date('2026-11-08T12:00:00Z')
const LAND = { width: 2048, height: 1536 }
const good = {
  uploadId: 'a',
  status: 'staged',
  stageOnly: true,
  title: 'Raclette chez Tom',
  crop: null,
  mediaSize: LAND,
} as const

it('publishes staged titled drafts in request order', () => {
  const plan = planPublish({
    requestedIds: ['b', 'a'],
    candidates: [good, { ...good, uploadId: 'b' }],
    frame: CARD_CROP_FRAME,
  })
  expect(plan).toEqual({ publish: ['b', 'a'], alreadyPublished: [], problems: [] })
})
it('treats publishing and ready as already published', () => {
  const plan = planPublish({
    requestedIds: ['a', 'b'],
    candidates: [
      { ...good, status: 'publishing' },
      { ...good, uploadId: 'b', status: 'ready' },
    ],
    frame: CARD_CROP_FRAME,
  })
  expect(plan).toEqual({ publish: [], alreadyPublished: ['a', 'b'], problems: [] })
})
it.each([
  ['pending', 'NOT_STAGED'],
  ['uploaded', 'NOT_STAGED'],
  ['processing', 'NOT_STAGED'],
  ['rejected', 'NOT_PUBLISHABLE'],
  ['failed', 'NOT_PUBLISHABLE'],
  ['discarded', 'NOT_PUBLISHABLE'],
] as const)('reports %s as %s', (status, reason) => {
  expect(
    planPublish({ requestedIds: ['a'], candidates: [{ ...good, status }], frame: CARD_CROP_FRAME })
      .problems,
  ).toEqual([{ uploadId: 'a', reason }])
})
it('rejects legacy uploads, missing ids, missing titles and invalid crops', () => {
  const plan = planPublish({
    requestedIds: ['a', 'x', 'c', 'd', 'e'],
    candidates: [
      { ...good, stageOnly: false },
      { ...good, uploadId: 'c', title: '   ' },
      { ...good, uploadId: 'd', crop: { x: 0.2, y: 0, w: 0.6, h: 1, rotate: 0 } },
      {
        ...good,
        uploadId: 'e',
        crop: { x: 0.2315340909, y: 0, w: 0.5369318182, h: 1, rotate: 0 },
        mediaSize: null,
      },
    ],
    frame: CARD_CROP_FRAME,
  })
  expect(plan.problems).toEqual([
    { uploadId: 'a', reason: 'NOT_PUBLISHABLE' },
    { uploadId: 'x', reason: 'NOT_FOUND' },
    { uploadId: 'c', reason: 'TITLE_REQUIRED' },
    { uploadId: 'd', reason: 'CROP_INVALID' },
    { uploadId: 'e', reason: 'CROP_INVALID' },
  ])
  expect(plan.publish).toEqual([])
})
it('accepts a 40-char title and refuses 41', () => {
  const at = (title: string) =>
    planPublish({ requestedIds: ['a'], candidates: [{ ...good, title }], frame: CARD_CROP_FRAME })
  expect(at('x'.repeat(40)).publish).toEqual(['a'])
  expect(at('x'.repeat(41)).problems[0]?.reason).toBe('TITLE_REQUIRED')
})
it('allows edits only on stage-only drafts still in flight or staged', () => {
  expect(canEditDraft({ status: 'staged', stageOnly: true })).toBe(true)
  expect(canEditDraft({ status: 'processing', stageOnly: true })).toBe(true)
  expect(canEditDraft({ status: 'staged', stageOnly: false })).toBe(false)
  for (const status of [
    'pending',
    'publishing',
    'ready',
    'rejected',
    'failed',
    'discarded',
  ] as const)
    expect(canEditDraft({ status, stageOnly: true })).toBe(false)
  expect(canDiscardUpload({ status: 'pending', stageOnly: false })).toBe(true)
  expect(canDiscardUpload({ status: 'ready', stageOnly: true })).toBe(false)
})
it('discards stage-only drafts in flight but not legacy completed uploads', () => {
  for (const status of ['uploaded', 'processing', 'staged'] as const) {
    expect(canDiscardUpload({ status, stageOnly: true })).toBe(true)
  }
  for (const status of ['uploaded', 'processing'] as const) {
    expect(canDiscardUpload({ status, stageOnly: false })).toBe(false)
  }
  for (const status of ['publishing', 'rejected', 'failed', 'discarded'] as const) {
    expect(canDiscardUpload({ status, stageOnly: true })).toBe(false)
  }
})
it('reports a legacy ready upload as not publishable rather than already published', () => {
  const plan = planPublish({
    requestedIds: ['a'],
    candidates: [{ ...good, status: 'ready', stageOnly: false }],
    frame: CARD_CROP_FRAME,
  })
  expect(plan).toEqual({
    publish: [],
    alreadyPublished: [],
    problems: [{ uploadId: 'a', reason: 'NOT_PUBLISHABLE' }],
  })
})
describe('classifyDraftForSweep', () => {
  const base = {
    status: 'staged',
    stageOnly: true,
    processedAt: NOW,
    publishRequestedAt: null,
    hasOwner: true,
    isOwnerMember: true,
    now: NOW,
  } as const
  const ago = (ms: number) => new Date(NOW.getTime() - ms)
  it('keeps a draft up to 48 h and deletes it after', () => {
    expect(classifyDraftForSweep({ ...base, createdAt: ago(DRAFT_TTL_MS - 60_000) })).toBe('keep')
    expect(classifyDraftForSweep({ ...base, createdAt: ago(DRAFT_TTL_MS) })).toBe('keep')
    expect(classifyDraftForSweep({ ...base, createdAt: ago(DRAFT_TTL_MS + 1) })).toBe('delete')
  })
  it('deletes drafts of deleted accounts and departed members at once', () => {
    expect(classifyDraftForSweep({ ...base, createdAt: NOW, hasOwner: false })).toBe('delete')
    expect(classifyDraftForSweep({ ...base, createdAt: NOW, isOwnerMember: false })).toBe('delete')
  })
  it('waits 30 min before deleting a discarded upload', () => {
    expect(
      classifyDraftForSweep({
        ...base,
        status: 'discarded',
        createdAt: NOW,
        processedAt: ago(DISCARDED_SWEEP_DELAY_MS - 1),
      }),
    ).toBe('keep')
    expect(
      classifyDraftForSweep({
        ...base,
        status: 'discarded',
        createdAt: NOW,
        processedAt: ago(DISCARDED_SWEEP_DELAY_MS + 1),
      }),
    ).toBe('delete')
  })
  it('recovers a publish stuck for 10 min', () => {
    expect(
      classifyDraftForSweep({
        ...base,
        status: 'publishing',
        createdAt: NOW,
        publishRequestedAt: ago(PUBLISH_STUCK_MS - 1),
      }),
    ).toBe('keep')
    expect(
      classifyDraftForSweep({
        ...base,
        status: 'publishing',
        createdAt: NOW,
        publishRequestedAt: ago(PUBLISH_STUCK_MS + 1),
      }),
    ).toBe('recover-publish')
  })
  it('ignores other statuses and legacy uploads', () => {
    expect(
      classifyDraftForSweep({ ...base, status: 'ready', createdAt: ago(DRAFT_TTL_MS * 3) }),
    ).toBe('keep')
    expect(
      classifyDraftForSweep({ ...base, stageOnly: false, createdAt: ago(DRAFT_TTL_MS * 3) }),
    ).toBe('keep')
  })
  it('deletes a discarded upload with no processing time and recovers a publish with no request time', () => {
    expect(
      classifyDraftForSweep({ ...base, status: 'discarded', createdAt: NOW, processedAt: null }),
    ).toBe('delete')
    expect(
      classifyDraftForSweep({
        ...base,
        status: 'publishing',
        createdAt: NOW,
        publishRequestedAt: null,
      }),
    ).toBe('recover-publish')
  })
})
