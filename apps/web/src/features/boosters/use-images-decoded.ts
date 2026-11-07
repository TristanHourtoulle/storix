import { useEffect, useMemo, useRef, useState } from 'react'

const DECODE_TIMEOUT_MS = 4000

interface ImagesDecoded {
  register: (index: number) => (img: HTMLImageElement | null) => void
  isReady: boolean
}

function ignoreImage(): void {}

/** Tracks `count` images and reports ready once all are decoded, or after a 4 s timeout. */
export function useImagesDecoded(count: number): ImagesDecoded {
  const imagesRef = useRef<(HTMLImageElement | null)[]>([])
  const [isReady, setIsReady] = useState(false)

  const callbacks = useMemo(
    () =>
      Array.from({ length: count }, (_, index) => (img: HTMLImageElement | null) => {
        imagesRef.current[index] = img
      }),
    [count],
  )

  useEffect(() => {
    let isActive = true
    const images = imagesRef.current.slice(0, count).flatMap((img) => (img ? [img] : []))
    const timer = setTimeout(() => {
      if (isActive) setIsReady(true)
    }, DECODE_TIMEOUT_MS)
    void Promise.allSettled(images.map((img) => img.decode())).then(() => {
      if (isActive) setIsReady(true)
    })
    return () => {
      isActive = false
      clearTimeout(timer)
    }
  }, [count])

  return { register: (index) => callbacks[index] ?? ignoreImage, isReady }
}
