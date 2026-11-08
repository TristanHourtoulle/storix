import type { CSSProperties } from 'react'
import type { ImageSet, ImageSource } from '@storix/shared'
import type { CropFrame, CropRect, ImageSize } from '@storix/shared/domain'

export interface CroppedImageProps {
  src: string
  imageSize: ImageSize
  crop: CropRect | null
  frame: CropFrame
  className?: string
  alt?: string
  image?: ImageSet
  sizes?: string
}

interface CropLayerProps {
  src: string
  imageSize: ImageSize
  crop: CropRect
  alt?: string
  image?: ImageSet
  sizes?: string
  className?: string
}

function toSrcSet(sources: readonly ImageSource[]): string {
  return sources.map((source) => `${source.url} ${source.width}w`).join(', ')
}

function percent(value: number): string {
  return `${value * 100}%`
}

/** Places the rotated image box so the crop rectangle fills its container. */
export function cropBoxStyle(crop: CropRect): CSSProperties {
  return {
    position: 'absolute',
    width: percent(1 / crop.w),
    height: percent(1 / crop.h),
    left: percent(-crop.x / crop.w),
    top: percent(-crop.y / crop.h),
  }
}

/** Sizes and turns the unrotated image inside the rotated box. */
export function cropImageStyle(crop: CropRect, imageSize: ImageSize): CSSProperties {
  const aspect = imageSize.width / imageSize.height
  const isQuarter = crop.rotate === 90 || crop.rotate === 270
  const width = isQuarter ? aspect : 1
  const height = isQuarter ? 1 / aspect : 1
  return {
    position: 'absolute',
    width: percent(width),
    height: percent(height),
    left: percent((1 - width) / 2),
    top: percent((1 - height) / 2),
    maxWidth: 'none',
    transform: `rotate(${crop.rotate}deg)`,
  }
}

function Picture({
  src,
  alt,
  image,
  sizes,
  style,
  className,
}: {
  src: string
  alt: string
  image?: ImageSet
  sizes?: string
  style: CSSProperties
  className?: string
}) {
  const img = (
    <img
      src={src}
      alt={alt}
      draggable={false}
      decoding="async"
      sizes={image ? sizes : undefined}
      style={style}
      className={`pointer-events-none select-none ${className ?? ''}`}
    />
  )
  if (!image) return img
  return (
    <picture>
      <source type="image/avif" srcSet={toSrcSet(image.avif)} sizes={sizes} />
      <source type="image/webp" srcSet={toSrcSet(image.webp)} sizes={sizes} />
      {img}
    </picture>
  )
}

/** The image positioned through a crop rectangle, relative to its nearest positioned ancestor. */
export function CropLayer({
  src,
  imageSize,
  crop,
  alt = '',
  image,
  sizes,
  className,
}: CropLayerProps) {
  return (
    <span aria-hidden={alt === '' || undefined} className={className} style={cropBoxStyle(crop)}>
      <Picture
        src={src}
        alt={alt}
        image={image}
        sizes={sizes}
        style={cropImageStyle(crop, imageSize)}
      />
    </span>
  )
}

/** Renders an image inside a frame of the crop ratio; a null crop is the automatic center crop. */
export function CroppedImage({
  src,
  imageSize,
  crop,
  frame,
  className = '',
  alt = '',
  image,
  sizes,
}: CroppedImageProps) {
  return (
    <span
      className={`relative block overflow-hidden ${className}`}
      style={{ aspectRatio: String(frame.aspect) }}
    >
      {crop === null ? (
        <Picture
          src={src}
          alt={alt}
          image={image}
          sizes={sizes}
          style={{ position: 'absolute', inset: 0 }}
          className="size-full object-cover"
        />
      ) : (
        <CropLayer
          src={src}
          imageSize={imageSize}
          crop={crop}
          alt={alt}
          image={image}
          sizes={sizes}
        />
      )}
    </span>
  )
}
