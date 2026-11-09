import { logger } from '@/lib/logger'
import type { ShareStyle, ShareSubject } from '../share-subject'

export const LOGO_SOURCES: readonly string[] = ['/icons/icon-512.png', '/icons/icon.svg']

export interface ShareAssets {
  logo: CanvasImageSource
  photos: ReadonlyMap<string, CanvasImageSource | null>
}

export const ASSET_TIMEOUT_MS = 6000
const FONT_TIMEOUT_MS = 2500
const CACHE_LIMIT = 8
const SHARE_FONTS = [
  '700 84px "Space Grotesk Variable"',
  '600 40px "Space Grotesk Variable"',
  '500 30px "Inter Variable"',
] as const

const imageCache = new Map<string, Promise<HTMLImageElement | null>>()

function loadImage(url: string): Promise<HTMLImageElement> {
  const image = new Image()
  image.decoding = 'async'
  image.src = url
  const decoded = image.decode().then(() => {
    if (image.naturalWidth === 0) throw new Error(`Image has no intrinsic size: ${url}`)
    return image
  })
  let timer = 0
  const deadline = new Promise<never>((_, reject) => {
    timer = window.setTimeout(() => {
      image.src = ''
      reject(new Error(`Image load timed out: ${url}`))
    }, ASSET_TIMEOUT_MS)
  })
  return Promise.race([decoded, deadline]).finally(() => window.clearTimeout(timer))
}

function evictOldest(): void {
  const oldest = imageCache.keys().next()
  if (!oldest.done) imageCache.delete(oldest.value)
}

function loadCachedImage(url: string): Promise<HTMLImageElement | null> {
  const cached = imageCache.get(url)
  if (cached) return cached
  if (imageCache.size >= CACHE_LIMIT) evictOldest()
  const pending = loadImage(url).catch((error: unknown) => {
    logger.warn('Share image asset failed to load', { url, error })
    imageCache.delete(url)
    return null
  })
  imageCache.set(url, pending)
  return pending
}

async function loadLogo(): Promise<HTMLImageElement> {
  for (const source of LOGO_SOURCES) {
    const logo = await loadCachedImage(source)
    if (logo) return logo
  }
  throw new Error('The Storix logo could not be loaded')
}

function subjectGlyphs(subject: ShareSubject): string {
  const cards = [subject.card, ...(subject.pack ?? [])]
  const words = cards.flatMap((card) => [card.facts.title, card.facts.tierLabel.toUpperCase()])
  return [...new Set([...words, subject.leagueName].join(''))].join('') || ' '
}

/** Waits for the share image fonts (for the subject's own glyphs), giving up silently after 2.5 s. */
export function ensureShareFonts(subject: ShareSubject): Promise<void> {
  if (typeof document.fonts?.load !== 'function') return Promise.resolve()
  const glyphs = subjectGlyphs(subject)
  const loaded = Promise.all(SHARE_FONTS.map((font) => document.fonts.load(font, glyphs))).then(
    () => undefined,
    (error: unknown) => logger.warn('Share fonts failed to load', { error }),
  )
  const timeout = new Promise<void>((resolve) => window.setTimeout(resolve, FONT_TIMEOUT_MS))
  return Promise.race([loaded, timeout])
}

/** Loads the logo and the photos a style needs; a photo that fails or stalls past 6 s maps to null. */
export async function loadShareAssets(
  subject: ShareSubject,
  style: ShareStyle,
): Promise<ShareAssets> {
  const cards = style === 'pack' && subject.pack ? subject.pack : [subject.card]
  const [logo, photos] = await Promise.all([
    loadLogo(),
    Promise.all(
      cards.map(
        async (card) =>
          [card.id, card.photoUrl ? await loadCachedImage(card.photoUrl) : null] as const,
      ),
    ),
  ])
  return { logo, photos: new Map(photos) }
}
