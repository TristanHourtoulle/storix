import { CLIENT_MAX_EDGE_PX } from '@storix/shared'
import { captureOutputSize, cardCaptureRect } from '@storix/shared/domain'
import { canvasToJpeg } from '../decode-image'

const captureDates = new WeakMap<File, string>()

/** Draws the 63:88 center of the current frame (shrunk by digitalZoom) into an unmirrored JPEG File; null before the first frame. */
export async function captureFrame(
  video: HTMLVideoElement,
  digitalZoom: number,
): Promise<File | null> {
  const rect = cardCaptureRect({ width: video.videoWidth, height: video.videoHeight }, digitalZoom)
  if (!rect) return null
  const size = captureOutputSize(rect, CLIENT_MAX_EDGE_PX)
  const canvas = document.createElement('canvas')
  try {
    canvas.width = size.width
    canvas.height = size.height
    const context = canvas.getContext('2d')
    if (!context) return null
    context.drawImage(video, rect.x, rect.y, rect.width, rect.height, 0, 0, size.width, size.height)
    const blob = await canvasToJpeg(canvas)
    const now = new Date()
    const file = new File([blob], `storix-${now.getTime()}.jpg`, {
      type: 'image/jpeg',
      lastModified: now.getTime(),
    })
    captureDates.set(file, now.toISOString())
    return file
  } finally {
    canvas.width = 0
    canvas.height = 0
  }
}

/** Capture instant of a File made by captureFrame, or null for any other file. */
export function viewfinderCaptureDate(file: File): string | null {
  return captureDates.get(file) ?? null
}
