import { useEffect, useMemo, useRef, useState } from 'react'
import { shareFileName, type Box } from '@storix/shared'
import { logger } from '@/lib/logger'
import { renderShareImage } from './render-share-image'
import type { ShareStyle, ShareSubject } from './share-subject'

export type ShareImage =
  | { status: 'pending' }
  | { status: 'ready'; file: File; url: string; logoBox: Box }
  | { status: 'failed' }

type ShareImages = Readonly<Partial<Record<ShareStyle, ShareImage>>>

interface RenderedImages {
  subject: ShareSubject
  images: ShareImages
}

const PENDING: ShareImage = { status: 'pending' }

/** Renders every style to a PNG `File` and preview URL, the first style first; URLs are revoked on unmount. */
export function useShareImages(
  subject: ShareSubject,
  styles: readonly ShareStyle[],
  first: ShareStyle,
): ShareImages {
  const [rendered, setRendered] = useState<RenderedImages>({ subject, images: {} })
  const firstRef = useRef(first)

  useEffect(() => {
    let isCancelled = false
    let urls: readonly string[] = []
    const head = firstRef.current
    const order = styles.includes(head) ? [head, ...styles.filter((s) => s !== head)] : styles
    const fileName = shareFileName(subject.card.facts.title)
    const store = (style: ShareStyle, image: ShareImage): void =>
      setRendered((previous) => ({
        subject,
        images: { ...(previous.subject === subject ? previous.images : {}), [style]: image },
      }))

    const renderAll = async (): Promise<void> => {
      for (const style of order) {
        try {
          const { blob, logoBox } = await renderShareImage(style, subject)
          if (isCancelled) return
          const url = URL.createObjectURL(blob)
          urls = [...urls, url]
          const file = new File([blob], fileName, { type: 'image/png' })
          store(style, { status: 'ready', file, url, logoBox })
        } catch (error) {
          if (isCancelled) return
          logger.warn('Share image render failed', { style, error })
          store(style, { status: 'failed' })
        }
      }
    }
    void renderAll()

    return () => {
      isCancelled = true
      urls.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [subject, styles])

  return useMemo(() => {
    const images = rendered.subject === subject ? rendered.images : {}
    return styles.reduce<ShareImages>(
      (all, style) => ({ ...all, [style]: images[style] ?? PENDING }),
      {},
    )
  }, [rendered, subject, styles])
}
