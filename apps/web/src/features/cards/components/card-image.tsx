import { useState } from 'react'
import type { ImageSet, ImageSource } from '@storix/shared'
import { useThumbhashUrl } from '../use-thumbhash-url'

interface CardImageProps {
  image: ImageSet
  thumbhash: string
  width: number
  height: number
  sizes: string
  alt: string
  isEager?: boolean
}

function toSrcSet(sources: ImageSource[]): string {
  return sources.map((source) => `${source.url} ${source.width}w`).join(', ')
}

function largest(sources: ImageSource[]): ImageSource | undefined {
  return sources.reduce<ImageSource | undefined>(
    (best, source) => (best && best.width >= source.width ? best : source),
    undefined,
  )
}

export function CardImage({
  image,
  thumbhash,
  width,
  height,
  sizes,
  alt,
  isEager = false,
}: CardImageProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const placeholder = useThumbhashUrl(thumbhash)
  const fallback = largest(image.webp)

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
          alt={alt}
          width={width}
          height={height}
          sizes={sizes}
          loading={isEager ? 'eager' : 'lazy'}
          decoding="async"
          onLoad={() => setIsLoaded(true)}
          ref={(node) => {
            if (node?.complete && node.naturalWidth > 0) setIsLoaded(true)
          }}
          className={`size-full object-cover transition-opacity duration-300 motion-reduce:transition-none ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
        />
      </picture>
    </div>
  )
}
