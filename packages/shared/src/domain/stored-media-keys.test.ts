import { describe, expect, it } from 'vitest'
import { mediaCropVariantKey, mediaVariantKey, storedMediaKeys } from './media-urls'

const leagueId = '0b7c2f4e-1a2b-4c3d-8e9f-0123456789ab'
const sourceSha256 = 'b'.repeat(64)
const cropId = '0123456789abcdef'
const fullFrame = [256, 768, 1600].flatMap((size) =>
  (['avif', 'webp'] as const).map((format) =>
    mediaVariantKey({ leagueId, sourceSha256, size: size as 256 | 768 | 1600, format }),
  ),
)
const cropped = fullFrame.map((key) =>
  key.replace(`${sourceSha256}/`, `${sourceSha256}/c${cropId}/`),
)

describe('storedMediaKeys', () => {
  it('returns the six full-frame keys once for an uncropped media', () => {
    const keys = storedMediaKeys({
      leagueId,
      sourceSha256,
      variants: fullFrame.map((key) => ({ key })),
    })
    expect(keys).toHaveLength(6)
    expect(new Set(keys)).toEqual(new Set(fullFrame))
  })

  it('adds the full-frame keys a cropped media no longer lists', () => {
    const keys = storedMediaKeys({
      leagueId,
      sourceSha256,
      variants: cropped.map((key) => ({ key })),
    })
    expect(new Set(keys)).toEqual(new Set([...cropped, ...fullFrame]))
    expect(keys).toHaveLength(12)
  })

  it('adds the cropped keys of extra crop ids and the source when given', () => {
    const keys = storedMediaKeys({
      leagueId,
      sourceSha256,
      variants: [],
      cropIds: [cropId, cropId],
      sourceKey: 'incoming/u/1',
    })
    expect(new Set(keys)).toEqual(new Set([...fullFrame, ...cropped, 'incoming/u/1']))
    expect(keys).toHaveLength(13)
  })

  it('ignores a null source and an empty crop list', () => {
    const keys = storedMediaKeys({
      leagueId,
      sourceSha256,
      variants: [],
      cropIds: [],
      sourceKey: null,
    })
    expect(keys).toEqual(expect.arrayContaining(fullFrame))
    expect(keys).toHaveLength(6)
  })

  it('builds cropped keys with the same layout as mediaCropVariantKey', () => {
    const keys = storedMediaKeys({ leagueId, sourceSha256, variants: [], cropIds: [cropId] })
    expect(keys).toContain(
      mediaCropVariantKey({ leagueId, sourceSha256, cropId, size: 768, format: 'webp' }),
    )
  })
})
