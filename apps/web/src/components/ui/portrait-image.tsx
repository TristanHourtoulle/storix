import { useState } from 'react'
import type { Portrait } from '@storix/shared'

interface PortraitImageProps {
  portrait: Portrait
  sizes: string
  className?: string
  onError?: () => void
}

/** Square portrait picking the 128 px or 512 px render, painted with its dominant color while loading. */
export function PortraitImage({ portrait, sizes, className = '', onError }: PortraitImageProps) {
  return (
    <img
      alt=""
      decoding="async"
      loading="lazy"
      draggable={false}
      srcSet={`${portrait.thumbUrl} 128w, ${portrait.url} 512w`}
      sizes={sizes}
      src={portrait.thumbUrl}
      onError={onError}
      className={className}
      style={{ backgroundColor: portrait.dominantColor }}
    />
  )
}

/** Returns the portrait to show, or null once its image failed to load; a new URL is tried again. */
export function useVisiblePortrait(portrait: Portrait | null): {
  visible: Portrait | null
  markFailed: () => void
} {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const url = portrait?.url ?? null
  return {
    visible: portrait !== null && portrait.url !== failedUrl ? portrait : null,
    markFailed: () => setFailedUrl(url),
  }
}
