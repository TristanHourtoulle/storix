import { useCallback, useState } from 'react'
import type { ImageSet, ImageSource } from '@storix/shared'
import { largestSource } from '../image-source'
import { useThumbhashUrl } from '../use-thumbhash-url'

interface CardImageProps {
  image: ImageSet
  thumbhash: string
  width: number
  height: number
  sizes: string
  isEager?: boolean
  isHighPriority?: boolean
  onImageRef?: (img: HTMLImageElement | null) => void
}

const loadedSources = new Set<string>()

function toSrcSet(sources: ImageSource[]): string {
  return sources.map((source) => `${source.url} ${source.width}w`).join(', ')
}

export function CardImage({
  image,
  thumbhash,
  width,
  height,
  sizes,
  isEager = false,
  isHighPriority = false,
  onImageRef,
}: CardImageProps) {
  const fallback = largestSource(image.webp)
  const sourceKey = fallback?.url ?? null
  const wasShownBefore = sourceKey !== null && loadedSources.has(sourceKey)
  const [isLoaded, setIsLoaded] = useState(wasShownBefore)
  const [hasFailed, setHasFailed] = useState(false)
  const markLoaded = useCallback(() => {
    if (sourceKey !== null) loadedSources.add(sourceKey)
    setIsLoaded(true)
  }, [sourceKey])
  const imageRef = useCallback(
    (node: HTMLImageElement | null) => {
      if (node?.complete && node.naturalWidth > 0) markLoaded()
      onImageRef?.(node)
    },
    [onImageRef, markLoaded],
  )
  const placeholder = useThumbhashUrl(thumbhash)

  return (
    <div
      className="absolute inset-0 bg-cover bg-center"
      style={placeholder ? { backgroundImage: `url(${placeholder})` } : undefined}
    >
      <picture>
        <source type="image/avif" srcSet={toSrcSet(image.avif)} sizes={sizes} />
        <source type="image/webp" srcSet={toSrcSet(image.webp)} sizes={sizes} />
        <img
          src={fallback?.url}
          alt=""
          width={width}
          height={height}
          sizes={sizes}
          loading={isEager ? 'eager' : 'lazy'}
          decoding="async"
          onLoad={markLoaded}
          ref={imageRef}
          onError={() => setHasFailed(true)}
          fetchPriority={isHighPriority ? 'high' : undefined}
          className={`size-full object-cover motion-reduce:transition-none ${wasShownBefore ? '' : 'transition-opacity duration-300'} ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
        />
      </picture>
      {hasFailed ? (
        <span className="absolute inset-0 grid place-items-center bg-surface-2/80 px-2 text-center text-[11px] text-muted">
          Image indisponible
        </span>
      ) : null}
    </div>
  )
}
