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
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasFailed, setHasFailed] = useState(false)
  const imageRef = useCallback(
    (node: HTMLImageElement | null) => {
      if (node?.complete && node.naturalWidth > 0) setIsLoaded(true)
      onImageRef?.(node)
    },
    [onImageRef],
  )
  const placeholder = useThumbhashUrl(thumbhash)
  const fallback = largestSource(image.webp)

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
          onLoad={() => setIsLoaded(true)}
          ref={imageRef}
          onError={() => setHasFailed(true)}
          fetchPriority={isHighPriority ? 'high' : undefined}
          className={`size-full object-cover transition-opacity duration-300 motion-reduce:transition-none ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
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
